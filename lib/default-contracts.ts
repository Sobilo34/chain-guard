/**
 * Single source of truth for default monitored contracts.
 * Used by:
 * - lib/storage.ts → dashboard seed (localStorage)
 * - app/api/cre/simulate/route.ts → CRE config.json
 * Keeping these in sync ensures "Force Scan" uses the same contracts as the dashboard.
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

/** Raw entries: same addresses/names/chains for both CRE and dashboard */
const DEFAULT_ENTRIES: Array<{
  address: string;
  name: string;
  chainSelectorName: string;
  riskThresholds: { depegTolerance?: number; volatilityMax?: number; liquidityDropMax?: number; collateralRatioMin?: number };
  priceFeeds: Array<{ pairName: string; feedAddress: string; decimals: number }>;
  /** dashboard-only */
  tvl: string;
  riskLevel: "low" | "medium" | "high";
  status: string;
  volatility: string;
}> = [
  {
    address: "0x514910771af9ca656af840dff83e8264ecf986ca",
    name: "Chainlink",
    chainSelectorName: "ethereum-mainnet",
    riskThresholds: { depegTolerance: 0.02, volatilityMax: 0.15, liquidityDropMax: 0.25, collateralRatioMin: 1.5 },
    priceFeeds: [{ pairName: "LINK/USD", feedAddress: "0x2c1d072e50aD1FdecF8aC38D21Bf21bcfb1F3627", decimals: 8 }],
    tvl: "$125.0M",
    riskLevel: "low",
    status: "LOW",
    volatility: "2.4%",
  },
  {
    address: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419",
    name: "Discovered Contract",
    chainSelectorName: "ethereum-mainnet",
    riskThresholds: { depegTolerance: 0.02, volatilityMax: 0.15, liquidityDropMax: 0.25, collateralRatioMin: 1.5 },
    priceFeeds: [{ pairName: "ETH/USD", feedAddress: "0x5f4eC3Dd9Bbd43714FE2740F5E3616155c5b8419", decimals: 8 }],
    tvl: "$0.0M",
    riskLevel: "low",
    status: "LOW",
    volatility: "0.0%",
  },
  {
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    name: "USDT Stablecoin (Tether)",
    chainSelectorName: "ethereum-mainnet",
    riskThresholds: { depegTolerance: 0.01, volatilityMax: 0.1, liquidityDropMax: 0.2, collateralRatioMin: 1.5 },
    priceFeeds: [{ pairName: "USDT/USD", feedAddress: "0x3E7d1eA13978982C58110906476e3FFf87208e59", decimals: 8 }],
    tvl: "$0.0M",
    riskLevel: "low",
    status: "LOW",
    volatility: "0.0%",
  },
  {
    address: "0x222412af183bceadefd72e4cb1b71f1889953b1c",
    name: "Harvest Finance (fUSDT vault controller)",
    chainSelectorName: "ethereum-mainnet",
    riskThresholds: { depegTolerance: 0.008, volatilityMax: 0.08, liquidityDropMax: 0.18, collateralRatioMin: 1.3 },
    priceFeeds: [
      { pairName: "USDT/USD", feedAddress: "0x3E7d1eA13978982C58110906476e3FFf87208e59", decimals: 8 },
      { pairName: "ETH/USD", feedAddress: "0x5f4eC3Dd9Bbd43714FE2740F5E3616155c5b8419", decimals: 8 },
    ],
    tvl: "$0.0M",
    riskLevel: "low",
    status: "LOW",
    volatility: "0.0%",
  },
  {
    address: "0x41d5d79431a913c4ae7d69a668ecdfe5ff9dfb68",
    name: "Inverse Finance (INV collateral)",
    chainSelectorName: "ethereum-mainnet",
    riskThresholds: { depegTolerance: 0.03, volatilityMax: 0.12, liquidityDropMax: 0.22, collateralRatioMin: 1.4 },
    priceFeeds: [{ pairName: "ETH/USD", feedAddress: "0x5f4eC3Dd9Bbd43714FE2740F5E3616155c5b8419", decimals: 8 }],
    tvl: "$0.0M",
    riskLevel: "low",
    status: "LOW",
    volatility: "0.0%",
  },
  {
    address: "0x56d811088235f11c8920698a204a5010a788f4b3",
    name: "bZx Protocol (BZRX / Fulcrum)",
    chainSelectorName: "ethereum-mainnet",
    riskThresholds: { depegTolerance: 0.02, volatilityMax: 0.14, liquidityDropMax: 0.24, collateralRatioMin: 1.35 },
    priceFeeds: [{ pairName: "ETH/USD", feedAddress: "0x5f4eC3Dd9Bbd43714FE2740F5E3616155c5b8419", decimals: 8 }],
    tvl: "$0.0M",
    riskLevel: "low",
    status: "LOW",
    volatility: "0.0%",
  },
  {
    address: "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f",
    name: "Synthetix (SNX / sMKR oracle risk)",
    chainSelectorName: "ethereum-mainnet",
    riskThresholds: { depegTolerance: 0.025, volatilityMax: 0.12, liquidityDropMax: 0.2, collateralRatioMin: 1.4 },
    priceFeeds: [
      { pairName: "SNX/USD", feedAddress: "0xDC3EA94CD0AC27d9A86C180091e7f78C683d3699", decimals: 8 },
      { pairName: "ETH/USD", feedAddress: "0x5f4eC3Dd9Bbd43714FE2740F5E3616155c5b8419", decimals: 8 },
    ],
    tvl: "$0.0M",
    riskLevel: "low",
    status: "LOW",
    volatility: "0.0%",
  },
];

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
