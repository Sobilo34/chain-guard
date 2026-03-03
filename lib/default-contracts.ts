/**
 * Default monitored contracts: empty seed.
 * Contract list for Force Scan comes only from the app (user-added contracts via dashboard).
 * Storage seeds the dashboard with this list when localStorage is empty; empty = no pre-filled contracts.
 */

/** CRE config shape (config.json monitoredContracts) */
export type DefaultContractCRE = {
  address: string;
  name: string;
  chainSelectorName: string;
  riskThresholds: {
    depegTolerance?: number;
    volatilityMax?: number;
    liquidityDropMax?: number;
    collateralRatioMin?: number;
  };
  alertChannels: readonly ("email" | "slack" | "telegram" | "discord" | "onchain")[];
  priceFeeds?: Array<{ pairName: string; feedAddress: string; decimals: number }>;
};

/** Raw entries: empty so only user-added contracts appear. */
const DEFAULT_ENTRIES: Array<{
  address: string;
  name: string;
  chainSelectorName: string;
  riskThresholds: { depegTolerance?: number; volatilityMax?: number; liquidityDropMax?: number; collateralRatioMin?: number };
  priceFeeds: Array<{ pairName: string; feedAddress: string; decimals: number }>;
  tvl: string;
  riskLevel: "low" | "medium" | "high";
  status: string;
  volatility: string;
}> = [];

/** Normalize address to lowercase 0x-prefixed */
function norm(addr: string): string {
  const a = (addr || "").toLowerCase().trim();
  return a.startsWith("0x") ? a : `0x${a}`;
}

/** For CRE config.json – monitoredContracts array */
export function getDefaultContractsCRE(): DefaultContractCRE[] {
  return DEFAULT_ENTRIES.map((e) => ({
    address: norm(e.address),
    name: e.name,
    chainSelectorName: e.chainSelectorName,
    riskThresholds: { ...e.riskThresholds },
    alertChannels: ["email"] as const,
    priceFeeds: e.priceFeeds.map((f) => ({ ...f })),
  }));
}

/** For dashboard seed – DashboardContract shape (id = address) */
export function getDefaultContractsDashboard(): Array<{
  id: string;
  name: string;
  address: string;
  tvl: string;
  riskLevel: "low" | "medium" | "high";
  volatility: string;
  chain: string;
  chainSelectorName: string;
  status: string;
  lastUpdate: string;
  priceFeeds: Array<{ pairName: string; feedAddress: string; decimals: number }>;
  riskThresholds: Record<string, number | undefined>;
}> {
  const now = new Date().toISOString();
  return DEFAULT_ENTRIES.map((e) => ({
    id: norm(e.address),
    name: e.name,
    address: norm(e.address),
    tvl: e.tvl,
    riskLevel: e.riskLevel,
    volatility: e.volatility,
    chain: "ethereumMainnet",
    chainSelectorName: e.chainSelectorName,
    status: e.status,
    lastUpdate: now,
    priceFeeds: e.priceFeeds.map((f) => ({ ...f })),
    riskThresholds: { ...e.riskThresholds },
  }));
}
