import { ContractStorage } from "./storage";
import type { OnchainAssessment } from "./cre-consumer";

export const API_BASE_URL = "/api/cre";

/** AI analysis / latest scan result stored per contract */
export type ContractScanResult = {
  reasoning?: string;
  cause?: string;
  consequences?: string;
  estimatedImpact?: string;
  mitigationStrategy?: string;
  nextSteps?: string[];
  suggestedActions?: string[];
  affectedMetrics?: string[];
  /** From optional post-CRE AI (Force Scan with runPostCREAi) */
  comprehensiveSummary?: {
    summary?: string;
    keyFindings?: string[];
    recommendations?: string[];
    rootCause?: string;
    potentialImpact?: string;
    nextSteps?: string[];
    suggestedActions?: string[];
  };
  riskType?: string;
  riskLevel?: string;
};

/** Parsed SENTINEL_ASSESSMENT from CRE simulation stdout */
export type SentinelAssessment = {
  contractAddress: string;
  riskLevel: string;
  riskScore: number;
  metrics?: {
    volatility?: number;
    tvl?: number;
    liquidity?: number;
    currentPrice?: number;
    priceChange24h?: number;
    [key: string]: any;
  };
  latestScan?: ContractScanResult;
  comprehensiveSummary?: {
    summary?: string;
    keyFindings?: string[];
    recommendations?: string[];
    rootCause?: string;
    potentialImpact?: string;
    nextSteps?: string[];
    suggestedActions?: string[];
  };
};

export type DashboardContract = {
  id: string;
  name: string;
  address: string;
  tvl: string;
  riskLevel: "low" | "medium" | "high";
  volatility: string;
  chain: string;
  chainSelectorName?: string;
  status?: string;
  lastUpdate?: string;
  latestScan?: ContractScanResult;
  riskScore?: number;
  metrics?: {
    tvl?: number;
    price?: number;
    volume24h?: number;
    liquidity?: number;
    volatility?: number;
    [key: string]: any;
  };
  history?: {
    volatility?: Array<{ time: string; value: number }>;
    riskScore?: Array<{ time: string; value: number }>;
  };
  priceFeeds?: Array<{ pairName: string; feedAddress: string; decimals: number }>;
  riskThresholds?: Record<string, any>;
  /** Persisted Full Analysis (Pre-CRE + CRE + Post-CRE); shown until next analysis runs. */
  fullAnalysis?: AnalyzeResult;
  /** Tokens discovered when contract was added or when analysis ran; used for portfolio TVL. */
  discoveredTokens?: Array<{ address: string; symbol: string; decimals?: number }>;
  /** Set when trigger-analysis returns requestIds; cleared after assessment is applied (so cron results update lastUpdate). */
  pendingAssessmentRequestId?: string;
};

export type DashboardAlert = {
  id: string;
  timestamp: string;
  contract: string;
  contractName?: string;
  description?: string;
  type: string;
  severity: "low" | "medium" | "high";
  status: "active" | "acknowledged" | "resolved";
  /** When and how this alert was notified (e.g. email sent at creation). Only set when send actually succeeds. */
  notificationHistory?: Array<{ channel: string; time: string; status: string }>;
  /** Optional risk analysis for email and UI (AI summary, recommendations, etc.) */
  details?: {
    aiSummary?: string;
    keyFindings?: string[];
    recommendations?: string[];
    rootCause?: string;
    potentialImpact?: string;
    nextSteps?: string[];
    suggestedActions?: string[];
    [key: string]: unknown;
  };
};

export type OverviewPayload = {
  kpis: {
    monitoredContracts: number;
    activeAlerts: number;
    totalValueLocked: number;
    riskScore: number;
  };
  contracts: DashboardContract[];
  alerts: DashboardAlert[];
  system: {
    oracle: string;
    riskEngine: string;
    alertService: string;
    lastSync: string;
  };
};

export type ScanResult = {
  riskLevel: string;
  riskType: string;
  confidence: number;
  reasoning: string;
  suggestedActions: string[];
  affectedMetrics?: string[];
  estimatedImpact?: string;
  source?: string;
  quotaExceeded?: boolean;
};

export type AlertPayload = {
  alerts: DashboardAlert[];
  total: number;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`API ${res.status}: ${raw}`);
  }

  return res.json() as Promise<T>;
}

export async function getOverview(): Promise<{ data: OverviewPayload }> {
  // Use ContractStorage for overview
  return { data: ContractStorage.getOverview() };
}

export async function getContracts(): Promise<{ contracts: DashboardContract[] }> {
  return { contracts: ContractStorage.getContracts() };
}

export async function getContractDetail(address: string): Promise<any> {
  const contracts = ContractStorage.getContracts();
  const norm = (a: string) => (a || "").toLowerCase().trim();
  const contract = contracts.find((c) => norm(c.address) === norm(address));
  if (contract) {
    const riskScore = (contract as any).riskScore ||
      (contract.status === "CRITICAL" ? 92 :
        contract.status === "HIGH" ? 78 :
          contract.status === "MEDIUM" ? 45 : 15);
    return { ...contract, riskScore };
  }
  return null;
}

export async function addContract(payload: any): Promise<DashboardContract> {
  const discoveredTokens = payload.discoveredTokens?.length
    ? payload.discoveredTokens.map((t: { address?: string; symbol?: string; decimals?: number }) => ({
        address: (t.address || "").trim(),
        symbol: (t.symbol || "?").trim(),
        decimals: t.decimals,
      })).filter((t: { address: string }) => t.address.length > 0)
    : undefined;
  const newContract = ContractStorage.addContract({
    name: payload.name || "Unknown",
    address: payload.address,
    chain: payload.chain,
    chainSelectorName: payload.chainSelectorName,
    tvl: "$0.0M", // Initial TVL
    riskLevel: (payload.initialAssessment?.riskLevel?.toLowerCase() as any) || "low",
    volatility: "0.0%",
    status: payload.initialAssessment?.riskLevel || "LOW",
    latestScan: payload.initialAssessment,
    priceFeeds: payload.priceFeeds,
    riskThresholds: payload.riskThresholds,
    ...(discoveredTokens?.length ? { discoveredTokens } : {}),
  });

  return newContract;
}

export async function discoverContract(address: string, network: string) {
  return fetchJson<{ discovery: any; suggestedRequest: any; preliminaryAssessment: any }>(
    `${API_BASE_URL}/discover`,
    {
      method: "POST",
      body: JSON.stringify({ address, network }),
    }
  );
}

/** AI-first full analysis: contract context → AI config → CRE run → post-CRE AI analysis (mainnet only) */
export type AnalyzeResult = {
  contractContext: any;
  initialAnalysis: { summary?: string; keyRisks?: string[]; recommendations?: string[] };
  creObservations: any;
  finalAnalysis: {
    summary?: string;
    keyFindings?: string[];
    comparisonWithPreCRE?: string;
    recommendations?: string[];
    rootCause?: string;
    potentialImpact?: string;
    nextSteps?: string[];
    suggestedActions?: string[];
  };
  aiChosenConfig?: { priceFeedPairs?: string[]; riskThresholds?: any; resolvedPriceFeeds?: any[] };
  discoveredTokens?: Array<{ address: string; symbol: string; decimals?: number }>;
};

const ANALYZE_TIMEOUT_MS = 120_000; // 2 min for discover + pre-CRE + CRE + post-CRE

export async function runAnalyze(address: string, network: string): Promise<AnalyzeResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
  try {
    const out = await fetchJson<AnalyzeResult>(`${API_BASE_URL}/analyze`, {
      method: "POST",
      body: JSON.stringify({ address, network }),
      signal: controller.signal,
    });
    return out;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Apply a filled on-chain CRE assessment to a contract in storage (lastUpdate, riskLevel, latestScan).
 * Used by the dashboard background poller so cron/trigger-analysis results update each contract's "Last updated".
 */
export function applyOnchainAssessmentToContractStorage(
  contractAddress: string,
  assessment: OnchainAssessment
): void {
  const with0x =
    (contractAddress || "").toLowerCase().trim().startsWith("0x")
      ? (contractAddress || "").toLowerCase().trim()
      : `0x${(contractAddress || "").toLowerCase().trim()}`;
  const riskLevel = (assessment.riskLevelLabel || "LOW").toLowerCase() as "low" | "medium" | "high";
  ContractStorage.updateContract(with0x, {
    lastUpdate: new Date().toISOString(),
    riskLevel,
    status: assessment.riskLevelLabel || "LOW",
    riskScore: Number(assessment.riskScore),
    latestScan: {
      reasoning: assessment.summary,
      riskLevel: assessment.riskLevelLabel,
    },
  });
}

/** True when the contract name is a placeholder (unknown/generic). Only then should AI analysis update the name. */
export function isGenericOrUnknownContractName(name: string | undefined): boolean {
  const n = (name || "").trim();
  return (
    !n ||
    n === "Unknown" ||
    n === "Discovered Contract" ||
    n === "New Contract" ||
    n === "Contract"
  );
}

/** Derive CRE chain selector name from dashboard contract (for onchain request). */
export function getChainSelectorNameFromContract(contract: { chain?: string; chainSelectorName?: string }): string {
  const sel = (contract.chainSelectorName || "").toLowerCase();
  if (sel && (sel.includes("ethereum") || sel.includes("arbitrum") || sel.includes("optimism") || sel.includes("base") || sel.includes("polygon"))) {
    return contract.chainSelectorName!;
  }
  const chain = (contract.chain || "").toLowerCase();
  if (chain.includes("arbitrum") && !chain.includes("sepolia")) return "arbitrum-mainnet";
  if (chain.includes("optimism") && !chain.includes("sepolia")) return "optimism-mainnet";
  if (chain.includes("base") && !chain.includes("sepolia")) return "base-mainnet";
  if (chain.includes("polygon") && !chain.includes("amoy")) return "polygon-mainnet";
  return "ethereum-mainnet";
}

/** Derive analyze API network string from a dashboard contract (chainSelectorName / chain). */
export function getNetworkFromContract(contract: DashboardContract): string {
  const chain = (contract as any).chain;
  if (chain && typeof chain === "string") {
    const c = chain.toLowerCase();
    if (c.includes("arbitrum") && !c.includes("sepolia")) return "arbitrumMainnet";
    if (c.includes("optimism") && !c.includes("sepolia")) return "optimismMainnet";
    if (c.includes("base") && !c.includes("sepolia")) return "baseMainnet";
    if (c.includes("polygon") && !c.includes("amoy")) return "polygonMainnet";
    if (c.includes("ethereum")) return "ethereumMainnet";
  }
  const sel = (contract.chainSelectorName || "").toLowerCase();
  if (sel.includes("arbitrum") && !sel.includes("sepolia")) return "arbitrumMainnet";
  if (sel.includes("optimism") && !sel.includes("sepolia")) return "optimismMainnet";
  if (sel.includes("base") && !sel.includes("sepolia")) return "baseMainnet";
  if (sel.includes("polygon") && !sel.includes("amoy")) return "polygonMainnet";
  return "ethereumMainnet";
}

/** Payload for enriching on-chain CRE summary into full finalAnalysis (non-blocking). */
export type EnrichCREPayload = {
  summary: string;
  riskLevel: string;
  riskScore: string;
  contractAddress: string;
  chainSelectorName?: string;
  contractName?: string;
};

/** Response from POST /api/cre/enrich — merged into result.finalAnalysis. */
export type EnrichFinalAnalysis = {
  summary?: string;
  keyFindings?: string[];
  comparisonWithPreCRE?: string;
  rootCause?: string;
  potentialImpact?: string;
  recommendations?: string[];
  nextSteps?: string[];
  suggestedActions?: string[];
};

/** Enrich on-chain CRE result with detailed report (executive summary, root cause, recommendations). Call after applying on-chain result; does not block. */
export async function enrichCREOnchainResult(
  payload: EnrichCREPayload
): Promise<EnrichFinalAnalysis> {
  const res = await fetch(`${API_BASE_URL}/enrich`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string })?.error || `Enrich failed: ${res.status}`);
  }
  return res.json();
}

/** Apply a full analysis result to contract storage (used by Force Scan and by contract detail page). */
export function applyAnalyzeResultToStorage(
  contractAddress: string,
  result: AnalyzeResult & { discoveredTokens?: Array<{ address: string; symbol: string; decimals?: number }> },
  existingContract?: DashboardContract | null
): void {
  const addr = (contractAddress || "").toLowerCase().trim();
  const with0x = addr.startsWith("0x") ? addr : `0x${addr}`;
  const f = result.finalAnalysis;
  const latestScanFromAnalysis = {
    reasoning: f?.summary ?? result.creObservations?.latestScan?.reasoning,
    cause: f?.rootCause,
    consequences: f?.potentialImpact,
    estimatedImpact: f?.potentialImpact,
    mitigationStrategy: f?.recommendations?.length
      ? f.recommendations.join("\n\n")
      : undefined,
    nextSteps: f?.nextSteps,
    suggestedActions: f?.suggestedActions,
    affectedMetrics: result.creObservations?.metrics ? Object.keys(result.creObservations.metrics) : undefined,
    riskLevel: result.creObservations?.riskLevel,
  };
  const discoveredTokens = result.discoveredTokens?.length
    ? result.discoveredTokens
    : (result.contractContext?.tokens as Array<{ address: string; symbol: string; decimals?: number }> | undefined);

  const discoveredName = (result.contractContext?.name || "").trim();
  const isGenericName = !discoveredName || discoveredName === "Discovered Contract" || discoveredName === "New Contract";
  const tokens = result.contractContext?.tokens;
  const tokenSymbols = Array.isArray(tokens)
    ? (tokens as Array<{ symbol?: string }>).map((t) => t.symbol).filter(Boolean).slice(0, 3)
    : [];
  const fallbackName =
    tokenSymbols.length > 0
      ? `Contract (${tokenSymbols.join(", ")})`
      : result.contractContext?.type
        ? `${result.contractContext.type} Contract`
        : undefined;
  const newName = !isGenericName ? discoveredName : (fallbackName || existingContract?.name);
  const shouldUpdateName =
    newName &&
    isGenericOrUnknownContractName(existingContract?.name);

  ContractStorage.updateContract(with0x, {
    ...(shouldUpdateName ? { name: newName } : {}),
    fullAnalysis: result,
    latestScan: latestScanFromAnalysis,
    riskLevel: (result.creObservations?.riskLevel || "LOW").toLowerCase() as any,
    status: result.creObservations?.riskLevel || "LOW",
    riskScore: result.creObservations?.riskScore,
    metrics:
      result.creObservations?.metrics && existingContract?.metrics
        ? { ...existingContract.metrics, ...result.creObservations.metrics }
        : result.creObservations?.metrics,
    ...(discoveredTokens?.length ? { discoveredTokens } : {}),
    lastUpdate: new Date().toISOString(),
  });
}

/** Run full analysis (Pre-CRE + CRE + Post-CRE) for every added contract and persist results. Used after Force Scan. */
export async function runFullAnalysisForAllContracts(): Promise<{
  success: number;
  failed: number;
  errors?: string[];
}> {
  const contracts = ContractStorage.getContracts();
  const errors: string[] = [];
  let success = 0;
  let failed = 0;
  for (const contract of contracts) {
    const address = contract.address;
    const network = getNetworkFromContract(contract);
    try {
      const result = await runAnalyze(address, network);
      applyAnalyzeResultToStorage(address, result, contract);
      success++;
    } catch (e: any) {
      failed++;
      const msg = e?.message || String(e);
      errors.push(`${contract.name || address}: ${msg}`);
    }
  }
  return { success, failed, errors: errors.length > 0 ? errors : undefined };
}

export type NeedMoreInfoQuestion = { id: string; label: string; placeholder?: string };

export type RunAnalyzeStreamCallbacks = {
  onNarrative: (text: string) => void;
  onResult: (result: AnalyzeResult) => void;
  onError: (message: string) => void;
  onNeedMoreInfo?: (questions: NeedMoreInfoQuestion[], message?: string) => void;
};

/** Consume the streaming analyze endpoint and invoke callbacks for each SSE event. */
export async function runAnalyzeStream(
  address: string,
  network: string,
  callbacks: RunAnalyzeStreamCallbacks,
  userContext?: Record<string, string>
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/analyze/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, network, ...(userContext && Object.keys(userContext).length > 0 ? { userContext } : {}) }),
    cache: "no-store",
  });
  if (!res.ok) {
    const raw = await res.text();
    if (res.status === 503) {
      try {
        const json = JSON.parse(raw);
        if (json.useOnchainCRE || json.code === "CRE_NOT_AVAILABLE") {
          callbacks.onError("CRE_NOT_AVAILABLE: Use Request onchain (CRE) below for verified analysis.");
          return;
        }
      } catch {
        // use raw below
      }
    }
    callbacks.onError(raw || `API ${res.status}`);
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";
      for (const block of lines) {
        const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        try {
          const raw = dataLine.slice(5).trim();
          if (raw === "[DONE]" || raw === "") continue;
          const payload = JSON.parse(raw) as {
            type: string;
            text?: string;
            message?: string;
            result?: AnalyzeResult;
            questions?: NeedMoreInfoQuestion[];
          };
          if (payload.type === "narrative" && typeof payload.text === "string") {
            callbacks.onNarrative(payload.text);
          } else if (payload.type === "result" && payload.result) {
            callbacks.onResult(payload.result as AnalyzeResult);
          } else if (payload.type === "error" && typeof payload.message === "string") {
            callbacks.onError(payload.message);
          } else if (payload.type === "needMoreInfo" && Array.isArray(payload.questions) && payload.questions.length > 0 && callbacks.onNeedMoreInfo) {
            callbacks.onNeedMoreInfo(payload.questions, payload.message);
          }
        } catch {
          // skip malformed chunk
        }
      }
    }
    if (buffer.trim()) {
      const dataLine = buffer.split("\n").find((l) => l.startsWith("data:"));
      if (dataLine) {
        try {
          const raw = dataLine.slice(5).trim();
          const payload = JSON.parse(raw) as {
            type: string;
            text?: string;
            message?: string;
            result?: AnalyzeResult;
            questions?: NeedMoreInfoQuestion[];
          };
          if (payload.type === "narrative" && typeof payload.text === "string") {
            callbacks.onNarrative(payload.text);
          } else if (payload.type === "result" && payload.result) {
            callbacks.onResult(payload.result as AnalyzeResult);
          } else if (payload.type === "error" && typeof payload.message === "string") {
            callbacks.onError(payload.message);
          } else if (payload.type === "needMoreInfo" && Array.isArray(payload.questions) && payload.questions.length > 0 && callbacks.onNeedMoreInfo) {
            callbacks.onNeedMoreInfo(payload.questions, payload.message);
          }
        } catch {
          // skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function runGeminiScan(payload?: {
  contractAddress?: string;
  chainSelectorName?: string;
  contractName?: string;
  /** When true, run post-CRE AI for each assessment (adds comprehensiveSummary; can slow response). */
  runPostCREAi?: boolean;
}) {
  const contracts = ContractStorage.getContracts();
  if (contracts.length === 0) {
    return { success: true, assessmentsCount: 0, data: null, quotaExceeded: false };
  }

  let scanInProgress = false;
  try {
    scanInProgress = (globalThis as any).__chainguard_scanInProgress === true;
  } catch {
    // ignore
  }
  if (scanInProgress) {
    return { success: false, assessmentsCount: 0, data: null, quotaExceeded: false };
  }
  (globalThis as any).__chainguard_scanInProgress = true;

  try {
  const response = await fetchJson<{ success: boolean; assessments: any[]; rawOutput?: string; error?: string }>(
    `${API_BASE_URL}/simulate`,
    {
      method: "POST",
      body: JSON.stringify({ contracts, runPostCREAi: payload?.runPostCREAi === true }),
    }
  );

  const assessments = response.assessments ?? [];
  const normalizeAddr = (addr: string) => {
    if (!addr) return "";
    const a = addr.toLowerCase().trim();
    return a.startsWith("0x") ? a : `0x${a}`;
  };

  if (response.success && assessments.length > 0) {
    for (const assessment of assessments) {
      const address = normalizeAddr(assessment.contractAddress);
      const cs = assessment.comprehensiveSummary;
      const latestScan = assessment.latestScan || (assessment as unknown as ContractScanResult);
      const scanTyped = latestScan as ContractScanResult;
      const withSummary: ContractScanResult = cs
        ? {
            ...latestScan,
            comprehensiveSummary: cs,
            reasoning: cs.summary ?? latestScan.reasoning,
            cause: cs.rootCause ?? latestScan.cause,
            consequences: cs.potentialImpact ?? latestScan.consequences,
            estimatedImpact: cs.potentialImpact ?? latestScan.estimatedImpact,
            mitigationStrategy: cs.recommendations?.length
              ? cs.recommendations.join("\n\n")
              : latestScan.mitigationStrategy,
            nextSteps: cs.nextSteps ?? latestScan.nextSteps,
            suggestedActions: cs.suggestedActions ?? latestScan.suggestedActions,
          }
        : latestScan;
      const updated = ContractStorage.updateContract(address, {
        riskLevel: assessment.riskLevel.toLowerCase() as any,
        status: assessment.riskLevel,
        riskScore: assessment.riskScore,
        latestScan: withSummary,
        metrics: assessment.metrics,
      });
      if (!updated) {
        console.warn("[runGeminiScan] No contract found for address:", address, "— ensure CRE config matches dashboard contracts.");
      }

      if (assessment.riskLevel === "HIGH" || assessment.riskLevel === "CRITICAL") {
        const scan = assessment.latestScan || (assessment as unknown as ContractScanResult);
        const details = (cs || scan?.reasoning || scanTyped?.mitigationStrategy)
          ? {
              aiSummary: cs?.summary ?? scan?.reasoning,
              rootCause: cs?.rootCause ?? scanTyped?.cause,
              potentialImpact: cs?.potentialImpact ?? scanTyped?.consequences ?? scanTyped?.estimatedImpact,
              keyFindings: cs?.keyFindings?.length ? cs.keyFindings : undefined,
              recommendations: cs?.recommendations?.length
                ? cs.recommendations
                : scanTyped?.mitigationStrategy
                  ? [scanTyped.mitigationStrategy]
                  : undefined,
              nextSteps: cs?.nextSteps ?? scanTyped?.nextSteps,
              suggestedActions: cs?.suggestedActions ?? scanTyped?.suggestedActions,
            }
          : undefined;
        const alertPayload = {
          timestamp: new Date().toISOString(),
          contract: address,
          contractName: contracts.find(c => normalizeAddr(c.address) === address)?.name || "Unknown",
          type: "High Risk Detected",
          description: scan?.reasoning || "AI detected high risk during scan.",
          severity: assessment.riskLevel.toLowerCase() as any,
          status: "active" as const,
          ...(details && Object.values(details).some(Boolean) ? { details } : {}),
        };
        const newAlert = ContractStorage.addAlert(alertPayload);
        const email = typeof window !== "undefined" ? localStorage.getItem("chainguard_alert_email") : null;
        if (email && email.trim()) {
          try {
            const res = await fetch("/api/notifications/send-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to: email.trim(), alert: { ...alertPayload, id: newAlert.id } }),
            });
            if (res.ok) {
              ContractStorage.updateAlert(newAlert.id, {
                notificationHistory: [{ channel: "Email", time: new Date().toISOString(), status: "Sent" }],
              });
            }
          } catch {
            // Email failed; alert still recorded, notificationHistory stays empty
          }
        }
      } else if (assessment.riskLevel === "MEDIUM") {
        const scan = assessment.latestScan || (assessment as unknown as ContractScanResult);
        const details = (cs || scan?.reasoning || scanTyped?.mitigationStrategy)
          ? {
              aiSummary: cs?.summary ?? scan?.reasoning,
              rootCause: cs?.rootCause ?? scanTyped?.cause,
              potentialImpact: cs?.potentialImpact ?? scanTyped?.consequences ?? scanTyped?.estimatedImpact,
              keyFindings: cs?.keyFindings?.length ? cs.keyFindings : undefined,
              recommendations: cs?.recommendations?.length
                ? cs.recommendations
                : scanTyped?.mitigationStrategy
                  ? [scanTyped.mitigationStrategy]
                  : undefined,
              nextSteps: cs?.nextSteps ?? scanTyped?.nextSteps,
              suggestedActions: cs?.suggestedActions ?? scanTyped?.suggestedActions,
            }
          : undefined;
        ContractStorage.addAlert({
          timestamp: new Date().toISOString(),
          contract: address,
          contractName: contracts.find(c => normalizeAddr(c.address) === address)?.name || "Unknown",
          type: "Medium Risk Detected",
          description: scan?.reasoning || "AI detected medium risk during scan.",
          severity: "medium",
          status: "active",
          ...(details && Object.values(details).some(Boolean) ? { details } : {}),
        });
        // No email for MEDIUM; only HIGH/CRITICAL send email
      }
    }
  }

  if (response.success) {
    ContractStorage.updateSyncTimestamp();
    await syncToServer({ contracts: ContractStorage.getContracts() });
  }

  return {
    data: {
      quotaExceeded: response.error?.includes("429")
    } as ScanResult,
    success: response.success,
    assessmentsCount: assessments.length,
  };
  } finally {
    (globalThis as any).__chainguard_scanInProgress = false;
  }
}

export async function getAlerts(
  address?: string,
  severity?: string,
  limit: number = 50,
  offset: number = 0
): Promise<AlertPayload> {
  let alerts = ContractStorage.getAlerts();
  if (address) {
    alerts = alerts.filter(a => a.contract.toLowerCase() === address.toLowerCase());
  }
  if (severity) {
    alerts = alerts.filter(a => a.severity.toLowerCase() === severity.toLowerCase());
  }

  const total = alerts.length;
  alerts = alerts.slice(offset, offset + limit);

  return { alerts, total };
}

export async function getAlertEmail() {
  const email = typeof window !== "undefined" ? localStorage.getItem("chainguard_alert_email") : null;
  return { email };
}

export async function setAlertEmail(email: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("chainguard_alert_email", email);
  }
  return { success: true, email };
}

export async function acknowledgeAlert(alertId: string) {
  const alerts = ContractStorage.getAlerts();
  const index = alerts.findIndex(a => a.id === alertId);
  if (index !== -1) {
    alerts[index].status = "acknowledged";
    ContractStorage.saveAlerts(alerts);
  }
  return { success: true };
}

export async function resolveAlert(alertId: string) {
  const alerts = ContractStorage.getAlerts();
  const index = alerts.findIndex(a => a.id === alertId);
  if (index !== -1) {
    alerts[index].status = "resolved";
    ContractStorage.saveAlerts(alerts);
  }
  return { success: true };
}

export async function deleteAlert(alertId: string) {
  const removed = ContractStorage.deleteAlert(alertId);
  return { success: removed };
}

/** Sync contracts and/or alert email to the server so the cron can use them. Call after adding/removing contracts or saving email. */
export async function syncToServer(payload: { contracts?: DashboardContract[]; alertEmail?: string }): Promise<void> {
  if (typeof window === "undefined") return;
  const body: { contracts?: DashboardContract[]; alertEmail?: string } = {};
  if (payload.contracts !== undefined) body.contracts = payload.contracts;
  if (payload.alertEmail !== undefined) body.alertEmail = payload.alertEmail.trim();
  if (Object.keys(body).length === 0) return;
  try {
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.warn("syncToServer failed", e);
  }
}

export async function triggerTestEmail(): Promise<{ success: boolean; message: string }> {
  const { email } = await getAlertEmail();
  if (!email || !email.trim()) {
    return { success: false, message: "Provide an alert email in settings first." };
  }
  const res = await fetch("/api/notifications/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: email.trim(), test: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: (data.error as string) || "Failed to send test email." };
  }
  return { success: true, message: (data.message as string) || "Test email sent." };
}
