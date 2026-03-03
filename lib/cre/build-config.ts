/**
 * Build CRE monitored-contract config from discovery using AI.
 * Used by both /api/cre/analyze and /api/cre/simulate when a contract has no cached config.
 */
import { getWellKnownFeeds, pairToSymbol } from "./feeds";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function openRouterJson<T>(prompt: string): Promise<T> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is required");
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://chainguard.sentinel",
      "X-Title": "ChainGuard Sentinel",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in AI response");
  return JSON.parse(match[0]) as T;
}

export type DiscoveryLike = {
  address: string;
  name?: string;
  type?: string;
  implementation?: string;
  tokens?: Array<{ symbol: string; balance: string }>;
  nativeBalance?: { symbol: string; balance: string };
  dataFeedsDetected?: Array<{ pairName: string; feedAddress: string }>;
  /** From enhanced discovery (Etherscan-style) */
  abi?: object[];
  sourceSummary?: string;
  explorerUrl?: string;
  /** User-provided answers when context was insufficient (e.g. from needMoreInfo form) */
  userProvided?: Record<string, string>;
};

export type SuggestedRequestLike = {
  chainSelectorName?: string;
  priceFeeds?: Array<{ pairName: string; feedAddress: string }>;
  riskThresholds?: Record<string, number>;
};

export type CREContractEntry = {
  address: string;
  name: string;
  chainSelectorName: string;
  riskThresholds: Record<string, number>;
  alertChannels: readonly string[];
  priceFeeds: Array<{ pairName: string; feedAddress: string; decimals: number }>;
};

type FirstAiOut = {
  priceFeedPairs?: string[];
  riskThresholds?: {
    depegTolerance?: number;
    volatilityMax?: number;
    liquidityDropMax?: number;
    collateralRatioMin?: number;
  };
  preCREAnalysis?: { summary?: string; keyRisks?: string[]; recommendations?: string[] };
};

const DEFAULT_THRESHOLDS = {
  depegTolerance: 0.02,
  volatilityMax: 0.15,
  liquidityDropMax: 0.25,
  collateralRatioMin: 1.5,
};

export type PreCREAnalysis = { summary?: string; keyRisks?: string[]; recommendations?: string[] };

export type BuildCREConfigOptions = {
  /** If true, AI also returns preCREAnalysis for the analyze flow */
  includePreCREAnalysis?: boolean;
};

/**
 * Build a single CRE monitored-contract entry from discovery using AI (feeds + thresholds).
 * Network should be the app network key (e.g. ethereumMainnet, polygonMainnet).
 * When includePreCREAnalysis is true, returns { creEntry, preCREAnalysis } for the analyze route.
 */
export async function buildCREConfigFromDiscovery(
  discovery: DiscoveryLike,
  suggestedRequest: SuggestedRequestLike | undefined,
  network: string,
  options?: BuildCREConfigOptions
): Promise<CREContractEntry | { creEntry: CREContractEntry; preCREAnalysis: PreCREAnalysis }> {
  const contractContext = {
    address: discovery.address,
    name: discovery.name,
    type: discovery.type,
    implementation: discovery.implementation,
    tokens: discovery.tokens,
    nativeBalance: discovery.nativeBalance,
    dataFeedsDetected: discovery.dataFeedsDetected,
    ...(discovery.abi && { abiSummary: `ABI with ${discovery.abi.length} items (functions/events)` }),
    ...(discovery.sourceSummary && { sourceSummary: discovery.sourceSummary }),
    ...(discovery.userProvided && Object.keys(discovery.userProvided).length > 0 && { userProvided: discovery.userProvided }),
  };
  const contextStr = JSON.stringify(contractContext, null, 2);

  const wantPreCRE = options?.includePreCREAnalysis === true;
  const prompt = `You are a DeFi risk analyst. Given the following MAINNET smart contract discovery (and optional verified source/ABI summary), determine:
1. Which price feeds to use for risk monitoring. Return "priceFeedPairs": array of pair names like ["ETH/USD", "USDC/USD"]. Only include pairs relevant to this contract's tokens and native asset. Use standard pairs: ETH/USD, USDC/USD, USDT/USD, DAI/USD, LINK/USD, MATIC/USD, SNX/USD as applicable.
2. Risk thresholds for the CRE (Chainlink Risk Engine): "riskThresholds" with optional numbers: depegTolerance (e.g. 0.01-0.05), volatilityMax (e.g. 0.1-0.2), liquidityDropMax (e.g. 0.2-0.3), collateralRatioMin (e.g. 1.2-2.0). Choose values appropriate for this contract type and assets.${wantPreCRE ? `
3. A pre-CRE analysis: "preCREAnalysis" with "summary" (short paragraph), "keyRisks" (array of strings), "recommendations" (array of strings).` : ""}

Return ONLY a JSON object with keys: priceFeedPairs, riskThresholds${wantPreCRE ? ", preCREAnalysis" : ""}.

Contract discovery (mainnet only):
${contextStr}`;

  let pairs: string[] = suggestedRequest?.priceFeeds?.map((f) => f.pairName) || ["ETH/USD"];
  let riskThresholds = suggestedRequest?.riskThresholds || DEFAULT_THRESHOLDS;

  let preCREAnalysis: PreCREAnalysis = { summary: "", keyRisks: [], recommendations: [] };
  try {
    const firstAi = await openRouterJson<FirstAiOut>(prompt);
    if (Array.isArray(firstAi.priceFeedPairs) && firstAi.priceFeedPairs.length > 0) {
      pairs = firstAi.priceFeedPairs;
    }
    if (firstAi.riskThresholds && typeof firstAi.riskThresholds === "object") {
      riskThresholds = { ...DEFAULT_THRESHOLDS, ...firstAi.riskThresholds };
    }
    if (wantPreCRE && firstAi.preCREAnalysis && typeof firstAi.preCREAnalysis === "object") {
      preCREAnalysis = {
        summary: firstAi.preCREAnalysis.summary ?? "",
        keyRisks: Array.isArray(firstAi.preCREAnalysis.keyRisks) ? firstAi.preCREAnalysis.keyRisks : [],
        recommendations: Array.isArray(firstAi.preCREAnalysis.recommendations) ? firstAi.preCREAnalysis.recommendations : [],
      };
    }
  } catch (e) {
    console.error("AI config builder failed, using discovery defaults", e);
  }

  const wellKnown = getWellKnownFeeds(network);
  const priceFeeds: Array<{ pairName: string; feedAddress: string; decimals: number }> = [];
  for (const pair of pairs) {
    const symbol = pairToSymbol(pair);
    const feedAddr = symbol ? wellKnown[symbol] : undefined;
    if (feedAddr) {
      priceFeeds.push({ pairName: pair, feedAddress: feedAddr, decimals: 8 });
    }
  }
  if (priceFeeds.length === 0 && wellKnown["ETH"]) {
    priceFeeds.push({ pairName: "ETH/USD", feedAddress: wellKnown["ETH"], decimals: 8 });
  }

  const chainSelectorName =
    suggestedRequest?.chainSelectorName ||
    (network === "polygonMainnet" ? "polygon-mainnet" : network === "arbitrumMainnet" ? "arbitrum-mainnet" : network === "optimismMainnet" ? "optimism-mainnet" : network === "baseMainnet" ? "base-mainnet" : "ethereum-mainnet");

  const address = (discovery.address || "").toLowerCase().startsWith("0x")
    ? discovery.address.toLowerCase()
    : `0x${discovery.address.toLowerCase()}`;

  const creEntry: CREContractEntry = {
    address,
    name: discovery.name || "Discovered Contract",
    chainSelectorName,
    riskThresholds,
    alertChannels: ["email"],
    priceFeeds,
  };
  if (wantPreCRE) {
    return { creEntry, preCREAnalysis };
  }
  return creEntry;
}

/** Map chainSelectorName from app to network key for discover API */
export function chainSelectorToNetwork(chainSelectorName: string): string {
  const s = (chainSelectorName || "").toLowerCase();
  if (s.includes("arbitrum") && !s.includes("sepolia")) return "arbitrumMainnet";
  if (s.includes("optimism") && !s.includes("sepolia")) return "optimismMainnet";
  if (s.includes("base") && !s.includes("sepolia")) return "baseMainnet";
  if (s.includes("polygon") && !s.includes("amoy")) return "polygonMainnet";
  return "ethereumMainnet";
}
