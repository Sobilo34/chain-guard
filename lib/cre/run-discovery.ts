/**
 * Shared discovery logic: on-chain read + ABI/source + AI naming.
 * Used by POST /api/cre/discover and by the analyze stream (in-process, no self-fetch).
 */

import { createPublicClient, http, parseAbi, Address, formatUnits } from "viem";
import { mainnet, arbitrum, optimism, base, polygon } from "viem/chains";
import { getWellKnownFeeds } from "@/lib/cre/feeds";
import { fetchContractAbi, fetchContractSource, getExplorerUrl } from "@/lib/cre/explorer-api";
import { buildCREConfigFromDiscovery } from "@/lib/cre/build-config";

const EIP1967_IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

const NETWORKS: Record<string, { chain: any; name: string; selector: string }> = {
  ethereumMainnet: { chain: mainnet, name: "Ethereum Mainnet", selector: "ethereum-mainnet" },
  mainnet: { chain: mainnet, name: "Ethereum Mainnet", selector: "ethereum-mainnet" },
  arbitrumMainnet: { chain: arbitrum, name: "Arbitrum Mainnet", selector: "arbitrum-mainnet" },
  optimismMainnet: { chain: optimism, name: "Optimism Mainnet", selector: "optimism-mainnet" },
  baseMainnet: { chain: base, name: "Base Mainnet", selector: "base-mainnet" },
  polygonMainnet: { chain: polygon, name: "Polygon Mainnet", selector: "polygon-mainnet" },
};

const ALCHEMY_RPC: Record<string, string> = {
  ethereumMainnet: "https://eth-mainnet.g.alchemy.com/v2",
  mainnet: "https://eth-mainnet.g.alchemy.com/v2",
  arbitrumMainnet: "https://arb-mainnet.g.alchemy.com/v2",
  optimismMainnet: "https://opt-mainnet.g.alchemy.com/v2",
  baseMainnet: "https://base-mainnet.g.alchemy.com/v2",
  polygonMainnet: "https://polygon-mainnet.g.alchemy.com/v2",
};

function getRpcUrl(network: string): string | undefined {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key?.trim()) return undefined;
  const baseUrl = ALCHEMY_RPC[network] || ALCHEMY_RPC.ethereumMainnet;
  return `${baseUrl}/${key.trim()}`;
}

function getCommonTokens(network: string): string[] {
  const net = network.toLowerCase();
  if (net.includes("mainnet")) {
    if (net.includes("polygon")) {
      return [
        "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      ];
    }
    return [
      "0x514910771af9ca656af840dff83e8264ecf986ca",
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    ];
  }
  return [];
}

export interface DiscoveryResult {
  discovery: {
    address: string;
    name: string;
    type: string;
    implementation?: string;
    tokens: any[];
    nativeBalance: { symbol: string; balance: string; balanceRaw: string };
    dataFeedsDetected: Array<{ pairName: string; feedAddress: string }>;
    abi?: object[];
    sourceSummary?: string;
    explorerUrl?: string;
  };
  suggestedRequest: {
    address: string;
    name: string;
    protocol: string;
    chain: string;
    chainSelectorName: string;
    chainName: string;
    priceFeeds: Array<{ pairName: string; feedAddress: string; decimals?: number }>;
    riskThresholds: Record<string, number>;
  };
  preliminaryAssessment: {
    riskLevel: string;
    riskType: string;
    confidence: number;
    reasoning: string;
    cause: string;
    consequences: string;
    nextSteps: string[];
    suggestedActions: string[];
    affectedMetrics: string[];
    estimatedImpact: string;
    mitigationStrategy: string;
  };
}

export async function runDiscovery(address: string, network: string): Promise<DiscoveryResult> {
  const netConfig = NETWORKS[network] || NETWORKS.ethereumMainnet;
  const rpcUrl = getRpcUrl(network);
  const client = createPublicClient({
    chain: netConfig.chain,
    transport: rpcUrl ? http(rpcUrl) : http(),
  });

  const contractAddress = address as Address;

  const code = await client.getBytecode({ address: contractAddress });
  if (!code || code === "0x") {
    throw new Error("Address is an EOA or not a contract");
  }

  const balance = await client.getBalance({ address: contractAddress });
  const nativeBalance = {
    symbol: network.toLowerCase().includes("polygon") ? "MATIC" : "ETH",
    balance: formatUnits(balance, 18),
    balanceRaw: balance.toString(),
  };

  let type: "Normal" | "Proxy" | "Diamond" = "Normal";
  let implementation: string | undefined;

  const storage = await client.getStorageAt({
    address: contractAddress,
    slot: EIP1967_IMPLEMENTATION_SLOT,
  });

  if (storage && storage !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
    implementation = `0x${storage.slice(-40)}`;
    type = "Proxy";
  } else {
    try {
      const diamondAbi = parseAbi(["function facets() view returns (tuple(address facetAddress, bytes4[] functionSelectors)[])"]);
      await client.readContract({
        address: contractAddress,
        abi: diamondAbi,
        functionName: "facets",
      });
      type = "Diamond";
    } catch {
      // not a diamond
    }
  }

  const commonTokens = getCommonTokens(network);
  const tokens: any[] = [];
  const abi = parseAbi([
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
  ]);

  for (const token of commonTokens) {
    try {
      const [tBalance, tDecimals, tSymbol] = await Promise.all([
        client.readContract({ address: token as Address, abi, functionName: "balanceOf", args: [contractAddress] }),
        client.readContract({ address: token as Address, abi, functionName: "decimals" }),
        client.readContract({ address: token as Address, abi, functionName: "symbol" }),
      ]);
      if (tBalance > BigInt(0)) {
        tokens.push({
          symbol: tSymbol,
          address: token,
          balance: formatUnits(tBalance, tDecimals),
          balanceRaw: tBalance.toString(),
          decimals: tDecimals,
        });
      }
    } catch {
      // skip token
    }
  }

  const [abiResult, sourceResult] = await Promise.all([
    fetchContractAbi(address, network).catch(() => undefined),
    fetchContractSource(address, network).catch(() => undefined),
  ]);
  const explorerUrl = getExplorerUrl(network, address);

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  let name = "Discovered Contract";
  const suggestions: string[] = [];

  if (OPENROUTER_API_KEY) {
    try {
      const prompt = `
          Analyze this smart contract discovery result and provide:
          1. A likely name for the protocol.
          2. Suggestions for risk monitoring.
          Address: ${address}
          Network: ${network}
          Type: ${type}
          Native Balance: ${nativeBalance.balance} ${nativeBalance.symbol}
          Tokens Held: ${JSON.stringify(tokens.map((t) => ({ symbol: t.symbol, balance: t.balance })))}
          Return ONLY a JSON object: { "name": "Protocol Name", "suggestions": ["suggestion 1"] }
        `;
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://chainguard.sentinel",
          "X-Title": "ChainGuard Sentinel",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          name = parsed.name || name;
          if (Array.isArray(parsed.suggestions)) suggestions.push(...parsed.suggestions);
        }
      }
    } catch (e) {
      console.error("AI Insights failed", e);
    }
  }

  const wellKnownFeeds = getWellKnownFeeds(network);
  const priceFeeds: Array<{ pairName: string; feedAddress: string; decimals: number }> = [];

  for (const t of tokens) {
    const feedAddr = wellKnownFeeds[t.symbol];
    if (feedAddr) {
      priceFeeds.push({ pairName: `${t.symbol}/USD`, feedAddress: feedAddr, decimals: 8 });
    }
  }
  if (wellKnownFeeds[nativeBalance.symbol]) {
    priceFeeds.push({
      pairName: `${nativeBalance.symbol}/USD`,
      feedAddress: wellKnownFeeds[nativeBalance.symbol],
      decimals: 8,
    });
  }

  const discovery = {
    address,
    name,
    type,
    implementation,
    tokens,
    nativeBalance,
    dataFeedsDetected: priceFeeds.map((f) => ({ pairName: f.pairName, feedAddress: f.feedAddress })),
    ...(abiResult && { abi: abiResult }),
    ...(sourceResult && { sourceSummary: sourceResult.sourceSummary }),
    ...(explorerUrl && { explorerUrl }),
  };

  const hasStablecoin = priceFeeds.some((f) => ["USDC/USD", "USDT/USD", "DAI/USD"].includes(f.pairName));

  let suggestedRequest: DiscoveryResult["suggestedRequest"] = {
    address,
    name,
    protocol: type === "Normal" ? "Generic" : type,
    chain: network,
    chainSelectorName: netConfig.selector,
    chainName: netConfig.name,
    priceFeeds,
    riskThresholds: {
      volatilityMax: 0.15,
      liquidityDropMax: 0.2,
      depegTolerance: hasStablecoin ? 0.01 : 0.05,
      collateralRatioMin: 1.5,
    },
  };

  if (process.env.OPENROUTER_API_KEY) {
    try {
      const creEntry = await buildCREConfigFromDiscovery(discovery, suggestedRequest, network);
      const entry = "creEntry" in creEntry ? creEntry.creEntry : creEntry;
      suggestedRequest = {
        ...suggestedRequest,
        name: entry.name,
        chainSelectorName: entry.chainSelectorName,
        priceFeeds: entry.priceFeeds,
        riskThresholds: entry.riskThresholds,
      };
    } catch (e) {
      console.error("AI config builder in discover failed, using heuristic suggestedRequest", e);
    }
  }

  const preliminaryAssessment: DiscoveryResult["preliminaryAssessment"] = {
    riskLevel: "LOW",
    riskType: "CUSTOM",
    confidence: 50,
    reasoning: `Initial scan for ${name} on ${netConfig.name}. Detected assets: ${nativeBalance.balance} ${nativeBalance.symbol} and ${tokens.length} tokens.`,
    cause: "Initial Discovery",
    consequences: "Calibrating risk thresholds.",
    nextSteps: ["Wait for monitoring"],
    suggestedActions: ["Monitor balances"],
    affectedMetrics: ["tvl"],
    estimatedImpact: "None",
    mitigationStrategy: "Automated monitoring enabled",
  };

  return { discovery, suggestedRequest, preliminaryAssessment };
}
