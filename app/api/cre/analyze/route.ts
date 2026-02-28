import { NextRequest, NextResponse } from "next/server";
import { getWellKnownFeeds, pairToSymbol } from "@/lib/cre/feeds";

const MAINNET_ALIASES: Record<string, string> = {
  ethereumMainnet: "ethereumMainnet",
  mainnet: "ethereumMainnet",
  arbitrumMainnet: "arbitrumMainnet",
  optimismMainnet: "optimismMainnet",
  baseMainnet: "baseMainnet",
  polygonMainnet: "polygonMainnet",
  "ethereum-mainnet": "ethereumMainnet",
  "arbitrum-mainnet": "arbitrumMainnet",
  "optimism-mainnet": "optimismMainnet",
  "base-mainnet": "baseMainnet",
  "polygon-mainnet": "polygonMainnet",
};

function isMainnet(network: string): boolean {
  const n = (network || "").toLowerCase();
  return (
    n.includes("mainnet") &&
    !n.includes("testnet") &&
    !n.includes("sepolia") &&
    !n.includes("amoy") &&
    !n.includes("holesky")
  );
}

async function openRouterJson<T>(prompt: string): Promise<T> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is required for analyze");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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

export async function POST(req: NextRequest) {
  try {
    const { address, network } = await req.json();
    if (!address) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }
    const net = (network || "ethereumMainnet").trim();
    if (!isMainnet(net)) {
      return NextResponse.json(
        { error: "Only mainnet is supported. Provide a mainnet network (e.g. ethereumMainnet, arbitrumMainnet)." },
        { status: 400 }
      );
    }

    const base = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
    const origin = req.nextUrl?.origin || (base && (base.startsWith("http") ? base : `https://${base}`)) || "http://localhost:3000";
    const discoverUrl = `${origin}/api/cre/discover`;
    const discoverRes = await fetch(discoverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, network: net }),
    });
    if (!discoverRes.ok) {
      const err = await discoverRes.text();
      return NextResponse.json(
        { error: "Discovery failed", details: err },
        { status: discoverRes.status }
      );
    }
    const discoverData = await discoverRes.json();
    const discovery = discoverData.discovery;
    const suggestedRequest = discoverData.suggestedRequest;
    if (!discovery) {
      return NextResponse.json({ error: "Discovery returned no contract context" }, { status: 500 });
    }

    const contractContext = {
      address: discovery.address,
      name: discovery.name,
      type: discovery.type,
      implementation: discovery.implementation,
      tokens: discovery.tokens,
      nativeBalance: discovery.nativeBalance,
      dataFeedsDetected: discovery.dataFeedsDetected,
    };

    const contextForAi = JSON.stringify(contractContext, null, 2);

    type FirstAiOut = {
      priceFeedPairs?: string[];
      riskThresholds?: { depegTolerance?: number; volatilityMax?: number; liquidityDropMax?: number; collateralRatioMin?: number };
      preCREAnalysis?: { summary?: string; keyRisks?: string[]; recommendations?: string[] };
    };

    const firstPrompt = `You are a DeFi risk analyst. Given the following MAINNET smart contract discovery, determine:
1. Which price feeds to use for risk monitoring. Return "priceFeedPairs": array of pair names like ["ETH/USD", "USDC/USD"]. Only include pairs relevant to this contract's tokens and native asset. Use standard pairs: ETH/USD, USDC/USD, USDT/USD, DAI/USD, LINK/USD, MATIC/USD as applicable.
2. Risk thresholds for the CRE (Chainlink Risk Engine): "riskThresholds" with optional numbers: depegTolerance (e.g. 0.01-0.05), volatilityMax (e.g. 0.1-0.2), liquidityDropMax (e.g. 0.2-0.3), collateralRatioMin (e.g. 1.2-2.0). Choose values appropriate for this contract type and assets.
3. A pre-CRE analysis: "preCREAnalysis" with "summary" (short paragraph), "keyRisks" (array of strings), "recommendations" (array of strings).

Return ONLY a JSON object with keys: priceFeedPairs, riskThresholds, preCREAnalysis.

Contract discovery (mainnet only):
${contextForAi}`;

    let firstAi: FirstAiOut = {};
    try {
      firstAi = await openRouterJson<FirstAiOut>(firstPrompt);
    } catch (e) {
      console.error("First AI call failed", e);
      firstAi = {
        priceFeedPairs: suggestedRequest?.priceFeeds?.map((f: { pairName: string }) => f.pairName) || ["ETH/USD"],
        riskThresholds: suggestedRequest?.riskThresholds || { depegTolerance: 0.02, volatilityMax: 0.15, liquidityDropMax: 0.25, collateralRatioMin: 1.5 },
        preCREAnalysis: { summary: "Pre-CRE analysis unavailable.", keyRisks: [], recommendations: [] },
      };
    }

    const pairs: string[] = Array.isArray(firstAi.priceFeedPairs) && firstAi.priceFeedPairs.length > 0
      ? firstAi.priceFeedPairs
      : (suggestedRequest?.priceFeeds?.map((f: { pairName: string }) => f.pairName) || ["ETH/USD"]);
    const wellKnown = getWellKnownFeeds(net);
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

    const riskThresholds = firstAi.riskThresholds || suggestedRequest?.riskThresholds || {
      depegTolerance: 0.02,
      volatilityMax: 0.15,
      liquidityDropMax: 0.25,
      collateralRatioMin: 1.5,
    };

    const analyzeContract = {
      address: discovery.address,
      name: discovery.name || "Discovered Contract",
      chainSelectorName: suggestedRequest?.chainSelectorName || "ethereum-mainnet",
      riskThresholds,
      priceFeeds,
    };

    const simulateUrl = `${origin}/api/cre/simulate`;
    const simulateRes = await fetch(simulateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analyzeContract }),
    });
    if (!simulateRes.ok) {
      const errText = await simulateRes.text();
      return NextResponse.json(
        { error: "CRE simulation failed", details: errText },
        { status: simulateRes.status }
      );
    }
    const simulateData = await simulateRes.json();
    const assessments = simulateData.assessments || [];
    const creObservation = assessments[0] || null;

    type SecondAiOut = { finalAnalysis?: { summary?: string; keyFindings?: string[]; comparisonWithPreCRE?: string; recommendations?: string[] } };
    let finalAnalysis: SecondAiOut["finalAnalysis"] = { summary: "", keyFindings: [], comparisonWithPreCRE: "", recommendations: [] };

    if (creObservation) {
      const preCRE = firstAi.preCREAnalysis;
      const secondPrompt = `You are a DeFi risk analyst. We have:
1) Initial (pre-CRE) analysis: ${JSON.stringify(preCRE)}
2) Contract context: ${contextForAi}
3) CRE (Chainlink Risk Engine) observations after running with AI-chosen feeds and thresholds:
${JSON.stringify(creObservation, null, 2)}

Provide a detailed "finalAnalysis" as a JSON object with:
- "summary": short overall conclusion
- "keyFindings": array of key points from the CRE run (metrics, violations, risk level)
- "comparisonWithPreCRE": how CRE results compare to the initial pre-CRE assessment
- "recommendations": array of actionable recommendations

Return ONLY a JSON object: { "finalAnalysis": { "summary": "...", "keyFindings": [], "comparisonWithPreCRE": "...", "recommendations": [] } }`;

      try {
        const secondAi = await openRouterJson<SecondAiOut>(secondPrompt);
        finalAnalysis = secondAi.finalAnalysis || finalAnalysis;
      } catch (e) {
        console.error("Second AI call failed", e);
        finalAnalysis = {
          summary: "Post-CRE analysis unavailable.",
          keyFindings: [creObservation?.latestScan?.reasoning || creObservation?.reasoning || "CRE completed."].filter(Boolean),
          comparisonWithPreCRE: "Could not generate comparison.",
          recommendations: [],
        };
      }
    }

    return NextResponse.json({
      contractContext,
      initialAnalysis: firstAi.preCREAnalysis || { summary: "", keyRisks: [], recommendations: [] },
      creObservations: creObservation,
      finalAnalysis,
      aiChosenConfig: { priceFeedPairs: pairs, riskThresholds, resolvedPriceFeeds: priceFeeds },
    });
  } catch (error: any) {
    console.error("Analyze failed", error);
    return NextResponse.json({ error: error?.message || "Analyze failed" }, { status: 500 });
  }
}
