/**
 * On-chain contract store: reads/writes ChainGuardRegistry on Sepolia.
 * Replaces server-store; uses off-chain cache for extended contract fields and full alert payloads.
 * When CHAINGUARD_REGISTRY_ADDRESS is not set, falls back to server-store for local dev.
 * Do not import from client components.
 */

import fs from "fs";
import path from "path";
import { createPublicClient, createWalletClient, http, parseAbi, type Address, keccak256, toBytes } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import type { DashboardContract, DashboardAlert } from "./api";

const DATA_DIR = process.env.CHAINGUARD_DATA_DIR || path.join(process.cwd(), ".data");
const CONTRACTS_EXTENDED_DIR = path.join(DATA_DIR, "contracts-extended");
const ALERTS_CACHE_PATH = path.join(DATA_DIR, "alerts-cache.json");

const REGISTRY_ABI = parseAbi([
  "function addOrUpdateContract(address contractAddress, string name, string chainSelectorName, string priceFeedsJson, string riskThresholdsJson) external",
  "function removeContract(address contractAddress) external",
  "function getContracts() view returns (address[] addresses, string[] names, string[] chainSelectorNames, string[] priceFeedsJsons, string[] riskThresholdsJsons)",
  "function setAlertEmail(string email) external",
  "function alertEmail() view returns (string)",
  "function addAlert(bytes32 alertId, address contractAddress, uint8 severity, uint256 timestamp) external returns (bytes32)",
  "function updateAlertStatus(bytes32 alertId, uint8 status) external",
  "function getAlerts(uint256 limit, uint256 offset) view returns (bytes32[] ids, address[] contractAddresses, uint8[] severities, uint256[] timestamps, uint8[] statuses)",
  "function getContractCount() view returns (uint256)",
  "function getAlertCount() view returns (uint256)",
]);

const SEVERITY: Record<string, number> = { low: 0, medium: 1, high: 2 };
const STATUS: Record<string, number> = { active: 0, acknowledged: 1, resolved: 2 };
const SEVERITY_REV: Record<number, "low" | "medium" | "high"> = { 0: "low", 1: "medium", 2: "high" };
const STATUS_REV: Record<number, "active" | "acknowledged" | "resolved"> = { 0: "active", 1: "acknowledged", 2: "resolved" };

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function normAddr(addr: string): string {
  const a = (addr || "").toLowerCase().trim();
  return a.startsWith("0x") ? a : `0x${a}`;
}

function stringToBytes32(s: string): `0x${string}` {
  const hash = keccak256(toBytes(s));
  return hash;
}

function useOnChainRegistry(): boolean {
  const addr = process.env.CHAINGUARD_REGISTRY_ADDRESS;
  return !!(addr && addr.startsWith("0x"));
}

function getRegistryAddress(): Address {
  const addr = process.env.CHAINGUARD_REGISTRY_ADDRESS;
  if (!addr || !addr.startsWith("0x")) throw new Error("CHAINGUARD_REGISTRY_ADDRESS must be set");
  return addr as Address;
}

function getRpcUrl(): string {
  if (process.env.SEPOLIA_RPC_URL) return process.env.SEPOLIA_RPC_URL;
  if (process.env.ALCHEMY_API_KEY) return `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  return "https://rpc.sepolia.org";
}

function getPublicClient() {
  return createPublicClient({ chain: sepolia, transport: http(getRpcUrl()) });
}

function getWalletClient() {
  const pk = process.env.CHAINGUARD_REGISTRY_PRIVATE_KEY;
  if (!pk) throw new Error("CHAINGUARD_REGISTRY_PRIVATE_KEY must be set for writes");
  const account = privateKeyToAccount(pk as `0x${string}`);
  return {
    publicClient: getPublicClient(),
    walletClient: createWalletClient({ account, chain: sepolia, transport: http(getRpcUrl()) }),
    account,
  };
}

function readExtendedContract(address: string): Partial<DashboardContract> | null {
  ensureDir(CONTRACTS_EXTENDED_DIR);
  const p = path.join(CONTRACTS_EXTENDED_DIR, `${normAddr(address)}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function writeExtendedContract(address: string, data: Partial<DashboardContract>) {
  ensureDir(CONTRACTS_EXTENDED_DIR);
  const p = path.join(CONTRACTS_EXTENDED_DIR, `${normAddr(address)}.json`);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
}

/** Update contract extended data from a scan assessment. Ensures lastUpdate, riskLevel, latestScan, metrics are persisted every interval. */
export async function updateContractFromScan(
  address: string,
  assessment: {
    riskLevel?: string;
    riskScore?: number;
    latestScan?: any;
    comprehensiveSummary?: any;
    metrics?: Record<string, unknown>;
  }
): Promise<void> {
  const addr = normAddr(address);
  const now = new Date().toISOString();
  const riskLevel = (assessment.riskLevel || "low").toLowerCase() as "low" | "medium" | "high";
  const cs = assessment.comprehensiveSummary;
  const latestScan = assessment.latestScan || assessment;
  const withSummary = cs
    ? {
        ...latestScan,
        reasoning: cs.summary ?? latestScan?.reasoning,
        cause: cs.rootCause ?? latestScan?.cause,
        consequences: cs.potentialImpact ?? latestScan?.consequences,
        mitigationStrategy: cs.recommendations?.length ? cs.recommendations.join("\n\n") : latestScan?.mitigationStrategy,
        nextSteps: cs.nextSteps ?? latestScan?.nextSteps,
        suggestedActions: cs.suggestedActions ?? latestScan?.suggestedActions,
      }
    : latestScan;

  if (useOnChainRegistry()) {
    const existing = readExtendedContract(addr) || {};
    writeExtendedContract(addr, {
      ...existing,
      lastUpdate: now,
      latestScan: withSummary,
      riskLevel,
      riskScore: assessment.riskScore ?? existing.riskScore,
      status: assessment.riskLevel || existing.status,
      metrics: { ...existing.metrics, ...assessment.metrics },
    });
    return;
  }
  const { getContracts, setContracts } = await import("./server-store");
  const contracts = await getContracts();
  const idx = contracts.findIndex((c) => normAddr(c.address) === addr);
  if (idx === -1) return;
  contracts[idx] = {
    ...contracts[idx],
    lastUpdate: now,
    latestScan: withSummary,
    riskLevel,
    riskScore: assessment.riskScore ?? contracts[idx].riskScore,
    status: assessment.riskLevel || contracts[idx].status,
    metrics: { ...contracts[idx].metrics, ...assessment.metrics },
  };
  await setContracts(contracts);
}

interface AlertsCache {
  alerts: Record<string, Partial<DashboardAlert>>;
  bytes32ToId: Record<string, string>;
  /** Soft-deleted alert IDs: hidden from dashboard and Alert Feeds (deleted in feed = gone everywhere) */
  deletedAlertIds?: string[];
}

function readAlertsCache(): AlertsCache {
  ensureDir(DATA_DIR);
  if (!fs.existsSync(ALERTS_CACHE_PATH)) return { alerts: {}, bytes32ToId: {}, deletedAlertIds: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(ALERTS_CACHE_PATH, "utf-8"));
    return {
      alerts: raw.alerts || {},
      bytes32ToId: raw.bytes32ToId || {},
      deletedAlertIds: Array.isArray(raw.deletedAlertIds) ? raw.deletedAlertIds : [],
    };
  } catch {
    return { alerts: {}, bytes32ToId: {}, deletedAlertIds: [] };
  }
}

function writeAlertsCache(cache: AlertsCache) {
  ensureDir(DATA_DIR);
  fs.writeFileSync(ALERTS_CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

/** Extended fields stored off-chain only (never on-chain) */
const EXTENDED_KEYS = [
  "tvl", "volatility", "riskScore", "status", "lastUpdate", "latestScan", "metrics", "history",
  "fullAnalysis", "discoveredTokens",
] as const;

function splitContract(c: DashboardContract): { onChain: Record<string, unknown>; extended: Partial<DashboardContract> } {
  const onChain: Record<string, unknown> = {};
  const extended: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(c)) {
    if (EXTENDED_KEYS.includes(k as any)) extended[k] = v;
    else onChain[k] = v;
  }
  onChain.address = normAddr(c.address);
  onChain.name = c.name || "Unknown";
  onChain.chainSelectorName = c.chainSelectorName || "ethereum-mainnet";
  onChain.chain = c.chain || "ethereumMainnet";
  onChain.riskLevel = c.riskLevel || "low";
  onChain.priceFeeds = c.priceFeeds || [];
  onChain.riskThresholds = c.riskThresholds || {};
  return { onChain, extended: extended as Partial<DashboardContract> };
}

export async function getContracts(): Promise<DashboardContract[]> {
  if (!useOnChainRegistry()) {
    const { getContracts: getFs } = await import("./server-store");
    return getFs();
  }
  const publicClient = getPublicClient();
  const registry = getRegistryAddress();
  const [addresses, names, chainSelectorNames, priceFeedsJsons, riskThresholdsJsons] = await publicClient.readContract({
    address: registry,
    abi: REGISTRY_ABI,
    functionName: "getContracts",
  });

  const result: DashboardContract[] = [];
  for (let i = 0; i < addresses.length; i++) {
    const addr = normAddr(addresses[i]);
    const extended = readExtendedContract(addr);
    let priceFeeds: Array<{ pairName: string; feedAddress: string; decimals: number }> = [];
    let riskThresholds: Record<string, number> = {};
    try {
      if (priceFeedsJsons[i]) priceFeeds = JSON.parse(priceFeedsJsons[i]);
    } catch {}
    try {
      if (riskThresholdsJsons[i]) riskThresholds = JSON.parse(riskThresholdsJsons[i]);
    } catch {}

    const chainMap: Record<string, string> = {
      "ethereum-mainnet": "ethereumMainnet",
      "polygon-mainnet": "polygonMainnet",
      "arbitrum-mainnet": "arbitrumMainnet",
      "optimism-mainnet": "optimismMainnet",
      "base-mainnet": "baseMainnet",
    };
    const chain = chainMap[chainSelectorNames[i]] || chainSelectorNames[i]?.replace(/-/g, "") || "ethereumMainnet";

    result.push({
      id: addr,
      address: addr,
      name: names[i] || "Unknown",
      chain,
      chainSelectorName: chainSelectorNames[i],
      tvl: extended?.tvl ?? "$0.0M",
      volatility: extended?.volatility ?? "0.0%",
      riskLevel: (extended?.riskLevel as "low" | "medium" | "high") ?? "low",
      priceFeeds,
      riskThresholds,
      ...extended,
    });
  }
  return result;
}

export async function setContracts(contracts: DashboardContract[]): Promise<void> {
  if (!useOnChainRegistry()) {
    const { setContracts: setFs } = await import("./server-store");
    return setFs(contracts);
  }
  const { publicClient, walletClient, account } = getWalletClient();
  const registry = getRegistryAddress();

  const current = await getContracts();
  const currentAddrs = new Set(current.map((c) => normAddr(c.address)));
  const newAddrs = new Set(contracts.map((c) => normAddr(c.address)));

  for (const c of contracts) {
    const addr = normAddr(c.address);
    const { onChain, extended } = splitContract(c);
    const priceFeedsJson = JSON.stringify((onChain.priceFeeds as any[]) || []);
    const riskThresholdsJson = JSON.stringify((onChain.riskThresholds as Record<string, number>) || {});

    const { request } = await publicClient.simulateContract({
      address: registry,
      abi: REGISTRY_ABI,
      functionName: "addOrUpdateContract",
      args: [addr as Address, onChain.name as string, onChain.chainSelectorName as string, priceFeedsJson, riskThresholdsJson],
      account,
    });
    await walletClient.writeContract(request);
    writeExtendedContract(addr, extended);
  }

  for (const addr of currentAddrs) {
    if (!newAddrs.has(addr)) {
      const { request } = await publicClient.simulateContract({
        address: registry,
        abi: REGISTRY_ABI,
        functionName: "removeContract",
        args: [addr as Address],
        account,
      });
      await walletClient.writeContract(request);
      const p = path.join(CONTRACTS_EXTENDED_DIR, `${addr}.json`);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }
}

export async function getAlertEmail(): Promise<string | null> {
  const publicClient = getPublicClient();
  const registry = getRegistryAddress();
  const email = await publicClient.readContract({
    address: registry,
    abi: REGISTRY_ABI,
    functionName: "alertEmail",
  });
  const s = (email || "").trim();
  return s || null;
}

export async function setAlertEmail(email: string | null): Promise<void> {
  if (!useOnChainRegistry()) {
    const { setAlertEmail: setFs } = await import("./server-store");
    return setFs(email);
  }
  const { publicClient, walletClient, account } = getWalletClient();
  const registry = getRegistryAddress();
  const value = email?.trim() || "";
  const { request } = await publicClient.simulateContract({
    address: registry,
    abi: REGISTRY_ABI,
    functionName: "setAlertEmail",
    args: [value],
    account,
  });
  await walletClient.writeContract(request);
}

export async function getAlerts(): Promise<DashboardAlert[]> {
  if (!useOnChainRegistry()) {
    const { getAlerts: getFs } = await import("./server-store");
    return getFs();
  }
  const publicClient = getPublicClient();
  const registry = getRegistryAddress();
  const count = await publicClient.readContract({
    address: registry,
    abi: REGISTRY_ABI,
    functionName: "getAlertCount",
  });
  const [ids, contractAddresses, severities, timestamps, statuses] = await publicClient.readContract({
    address: registry,
    abi: REGISTRY_ABI,
    functionName: "getAlerts",
    args: [count, BigInt(0)],
  });

  const cache = readAlertsCache();
  const deletedSet = new Set(cache.deletedAlertIds || []);
  const result: DashboardAlert[] = [];
  for (let i = 0; i < ids.length; i++) {
    const idBytesHex = ids[i]?.toString() || "";
    const idStr = cache.bytes32ToId[idBytesHex] ?? idBytesHex;
    if (deletedSet.has(idStr)) continue;
    const cached = cache.alerts[idStr] || {};
    result.push({
      id: cached.id ?? idStr,
      timestamp: new Date(Number(timestamps[i]) * 1000).toISOString(),
      contract: normAddr(contractAddresses[i]),
      type: cached.type ?? "Risk Detected",
      severity: SEVERITY_REV[severities[i]] ?? "medium",
      status: STATUS_REV[statuses[i]] ?? "active",
      ...cached,
    });
  }
  return result.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
}

export async function addAlert(alert: Omit<DashboardAlert, "id">): Promise<DashboardAlert> {
  const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const idBytes32 = stringToBytes32(id);
  const severityNum = SEVERITY[alert.severity?.toLowerCase()] ?? 1;
  const contractAddr = normAddr(alert.contract);
  const timestamp = Math.floor(new Date(alert.timestamp || Date.now()).getTime() / 1000);

  if (!useOnChainRegistry()) {
    const { addAlert: addFs } = await import("./server-store");
    return addFs(alert);
  }
  const { publicClient, walletClient, account } = getWalletClient();
  const registry = getRegistryAddress();
  const { request } = await publicClient.simulateContract({
    address: registry,
    abi: REGISTRY_ABI,
    functionName: "addAlert",
    args: [idBytes32, contractAddr as Address, severityNum, BigInt(timestamp)],
    account,
  });
  await walletClient.writeContract(request);

  const full: DashboardAlert = { ...alert, id };
  const cache = readAlertsCache();
  cache.alerts[id] = { ...full };
  cache.bytes32ToId[idBytes32] = id;
  writeAlertsCache(cache);

  return full;
}

export async function saveAlerts(alerts: DashboardAlert[]): Promise<void> {
  if (!useOnChainRegistry()) {
    const { saveAlerts: saveFs } = await import("./server-store");
    return saveFs(alerts);
  }
  const cache = readAlertsCache();
  cache.alerts = {};
  cache.bytes32ToId = {};
  for (const a of alerts) {
    cache.alerts[a.id] = { ...a };
    cache.bytes32ToId[stringToBytes32(a.id)] = a.id;
  }
  writeAlertsCache(cache);
}

export async function updateAlert(alertId: string, updates: Partial<DashboardAlert>): Promise<DashboardAlert | null> {
  if (!useOnChainRegistry()) {
    const { updateAlert: updateFs } = await import("./server-store");
    return updateFs(alertId, updates);
  }
  const cache = readAlertsCache();
  const existing = cache.alerts[alertId];
  if (!existing) return null;

  const merged: DashboardAlert = {
    ...existing,
    ...updates,
    id: alertId,
  } as DashboardAlert;
  if (updates.notificationHistory && updates.notificationHistory.length > 0) {
    const existingHistory = (existing.notificationHistory || []) as any[];
    merged.notificationHistory = [...existingHistory, ...(updates.notificationHistory || [])];
  }

  cache.alerts[alertId] = merged;
  writeAlertsCache(cache);

  if (updates.status) {
    const statusNum = STATUS[updates.status];
    if (statusNum !== undefined) {
      const { publicClient, walletClient, account } = getWalletClient();
      const registry = getRegistryAddress();
      const idBytes32 = stringToBytes32(alertId);
      const { request } = await publicClient.simulateContract({
        address: registry,
        abi: REGISTRY_ABI,
        functionName: "updateAlertStatus",
        args: [idBytes32, statusNum],
        account,
      });
      await walletClient.writeContract(request);
    }
  }

  return merged;
}

/** Soft-delete an alert: hidden from dashboard and Alert Feeds. Contract has no remove, so we only update cache. */
export async function deleteAlert(alertId: string): Promise<boolean> {
  if (!useOnChainRegistry()) {
    const { getAlerts: getFs, saveAlerts: saveFs } = await import("./server-store");
    const alerts = await getFs();
    const filtered = alerts.filter((a) => a.id !== alertId);
    if (filtered.length === alerts.length) return false;
    await saveFs(filtered);
    return true;
  }
  const cache = readAlertsCache();
  if (!cache.deletedAlertIds) cache.deletedAlertIds = [];
  if (cache.deletedAlertIds.includes(alertId)) return true;
  cache.deletedAlertIds.push(alertId);
  writeAlertsCache(cache);
  return true;
}
