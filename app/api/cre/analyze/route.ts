import { NextRequest, NextResponse } from "next/server";
import { buildCREConfigFromDiscovery } from "@/lib/cre/build-config";

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

    let creEntry: Awaited<ReturnType<typeof buildCREConfigFromDiscovery>>;
    let preCREAnalysis: { summary?: string; keyRisks?: string[]; recommendations?: string[] } = { summary: "", keyRisks: [], recommendations: [] };
    try {
      creEntry = await buildCREConfigFromDiscovery(discovery, suggestedRequest, net, { includePreCREAnalysis: true });
    } catch (e) {
      console.error("buildCREConfigFromDiscovery failed", e);
      return NextResponse.json({ error: "Failed to build CRE config from discovery" }, { status: 500 });
    }
    const entry = "creEntry" in creEntry ? creEntry.creEntry : creEntry;
    if ("preCREAnalysis" in creEntry && creEntry.preCREAnalysis) {
      preCREAnalysis = creEntry.preCREAnalysis;
    }

    const analyzeContract = {
      address: entry.address,
      name: entry.name,
      chainSelectorName: entry.chainSelectorName,
      riskThresholds: entry.riskThresholds,
      priceFeeds: entry.priceFeeds,
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

    type SecondAiOut = {
      finalAnalysis?: {
        summary?: string;
        keyFindings?: string[];
        comparisonWithPreCRE?: string;
        recommendations?: string[];
        rootCause?: string;
        potentialImpact?: string;
        nextSteps?: string[];
        suggestedActions?: string[];
      };
    };
    let finalAnalysis: NonNullable<SecondAiOut["finalAnalysis"]> = {
      summary: "",
      keyFindings: [],
      comparisonWithPreCRE: "",
      recommendations: [],
      rootCause: "",
      potentialImpact: "",
      nextSteps: [],
      suggestedActions: [],
    };

    if (creObservation) {
      const preCRE = preCREAnalysis;
      const secondPrompt = `You are a DeFi risk analyst. We have:
1) Initial (pre-CRE) analysis: ${JSON.stringify(preCRE)}
2) Contract context: ${contextForAi}
3) CRE (Chainlink Risk Engine) observations after running with AI-chosen feeds and thresholds:
${JSON.stringify(creObservation, null, 2)}

Provide a detailed "finalAnalysis" as a JSON object. You MUST include concrete, specific content (no placeholders like "No root cause identified"). Use the CRE observations to infer real root causes, impacts, and actions.

Required fields:
- "summary": 2-4 sentence overall conclusion based on CRE findings (risk level, key metrics, what was proven).
- "keyFindings": array of 3-6 specific points from the CRE run (exact metrics, violations, risk level, price/peg deviations).
- "comparisonWithPreCRE": how CRE results compare to the initial pre-CRE assessment; be specific.
- "rootCause": a clear 1-3 sentence explanation of the ROOT CAUSE of the identified risk (e.g. depeg, oracle deviation, liquidity drop). Never say "No root cause identified"—infer from CRE data.
- "potentialImpact": 1-3 sentences on financial and operational impact (e.g. user losses, protocol insolvency, TVL at risk). Never say "Impact assessment pending"—derive from CRE.
- "recommendations": array of 4-8 actionable recommendations to mitigate risk (e.g. "Pause withdrawals until peg restores", "Cross-validate with another price feed", "Set alerts at X% deviation"). Be specific and practical.
- "nextSteps": array of 2-4 immediate action items (urgent steps to take now).
- "suggestedActions": array of 2-5 longer-term safeguards (monitoring, audits, thresholds, governance). Include options the user can explore and things to take note of.

Return ONLY a JSON object: { "finalAnalysis": { "summary": "...", "keyFindings": [], "comparisonWithPreCRE": "...", "rootCause": "...", "potentialImpact": "...", "recommendations": [], "nextSteps": [], "suggestedActions": [] } }`;

      const POST_CRE_AI_TIMEOUT_MS = 60_000;
      try {
        const secondAi = await Promise.race([
          openRouterJson<SecondAiOut>(secondPrompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Post-CRE AI timeout")), POST_CRE_AI_TIMEOUT_MS)
          ),
        ]);
        if (secondAi?.finalAnalysis) {
          finalAnalysis = {
            summary: secondAi.finalAnalysis.summary ?? finalAnalysis.summary,
            keyFindings: secondAi.finalAnalysis.keyFindings ?? finalAnalysis.keyFindings,
            comparisonWithPreCRE: secondAi.finalAnalysis.comparisonWithPreCRE ?? finalAnalysis.comparisonWithPreCRE,
            recommendations: secondAi.finalAnalysis.recommendations ?? finalAnalysis.recommendations,
            rootCause: secondAi.finalAnalysis.rootCause ?? finalAnalysis.rootCause,
            potentialImpact: secondAi.finalAnalysis.potentialImpact ?? finalAnalysis.potentialImpact,
            nextSteps: secondAi.finalAnalysis.nextSteps ?? finalAnalysis.nextSteps,
            suggestedActions: secondAi.finalAnalysis.suggestedActions ?? finalAnalysis.suggestedActions,
          };
        }
      } catch (e) {
        console.error("Second AI call failed", e);
        const reasoning = creObservation?.latestScan?.reasoning || creObservation?.reasoning || "CRE completed.";
        finalAnalysis = {
          summary: "Post-CRE analysis unavailable.",
          keyFindings: [reasoning].filter(Boolean),
          comparisonWithPreCRE: "Could not generate comparison.",
          recommendations: ["Re-run Full Analysis for detailed recommendations."],
          rootCause: reasoning,
          potentialImpact: "Assess impact from CRE risk level and metrics above.",
          nextSteps: ["Review CRE observations", "Re-run analysis if needed"],
          suggestedActions: [],
        };
      }
    }

    return NextResponse.json({
      contractContext,
      initialAnalysis: preCREAnalysis,
      creObservations: creObservation,
      finalAnalysis,
      aiChosenConfig: { priceFeedPairs: entry.priceFeeds.map((f) => f.pairName), riskThresholds: entry.riskThresholds, resolvedPriceFeeds: entry.priceFeeds },
    });
  } catch (error: any) {
    console.error("Analyze failed", error);
    return NextResponse.json({ error: error?.message || "Analyze failed" }, { status: 500 });
  }
}
