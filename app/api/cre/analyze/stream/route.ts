import { NextRequest } from "next/server";
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

function sseLine(obj: {
  type: string;
  text?: string;
  message?: string;
  result?: unknown;
  questions?: Array<{ id: string; label: string; placeholder?: string }>;
}): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

const NEED_MORE_INFO_QUESTIONS: Array<{ id: string; label: string; placeholder?: string }> = [
  { id: "contractNameOnExplorer", label: "Contract name as shown on the block explorer (if known)", placeholder: "e.g. USDT, Uniswap V3 Pool" },
  { id: "protocolOrAsset", label: "Protocol or main asset this contract represents (if known)", placeholder: "e.g. USDT, WETH, lending pool" },
  { id: "mainTokensIfKnown", label: "Main tokens or pairs involved (optional)", placeholder: "e.g. ETH/USDC, USDT" },
];

function isInsufficientContext(discovery: any): boolean {
  const name = (discovery?.name || "").trim();
  const genericName = !name || name === "Discovered Contract";
  const noTokens = !Array.isArray(discovery?.tokens) || discovery.tokens.length === 0;
  const noAbi = !discovery?.abi;
  const noSource = !discovery?.sourceSummary;
  return genericName && noTokens && noAbi && noSource;
}

export async function POST(req: NextRequest) {
  let address: string;
  let network: string;
  let userContext: Record<string, string> | undefined;
  try {
    const body = await req.json();
    address = body?.address;
    network = (body?.network || "ethereumMainnet").trim();
    userContext = body?.userContext && typeof body.userContext === "object" ? body.userContext : undefined;
  } catch {
    return new Response(JSON.stringify({ error: "address is required" }), { status: 400 });
  }
  if (!address) {
    return new Response(JSON.stringify({ error: "address is required" }), { status: 400 });
  }
  if (!isMainnet(network)) {
    return new Response(
      JSON.stringify({
        error:
          "Only mainnet is supported. Provide a mainnet network (e.g. ethereumMainnet, arbitrumMainnet).",
      }),
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const base = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
  const origin =
    req.nextUrl?.origin ||
    (base && (base.startsWith("http") ? base : `https://${base}`)) ||
    "http://localhost:3000";

  const stream = new ReadableStream({
    async start(controller) {
      const push = (data: string) => controller.enqueue(encoder.encode(data));

      try {
        push(sseLine({ type: "narrative", text: "Reading the contract on-chain so we know what we're dealing with." }));

        const discoverUrl = `${origin}/api/cre/discover`;
        const discoverRes = await fetch(discoverUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, network }),
        });
        if (!discoverRes.ok) {
          const err = await discoverRes.text();
          push(sseLine({ type: "error", message: `Discovery failed: ${err}` }));
          controller.close();
          return;
        }
        const discoverData = await discoverRes.json();
        const discovery = discoverData.discovery;
        const suggestedRequest = discoverData.suggestedRequest;
        if (!discovery) {
          push(sseLine({ type: "error", message: "Discovery returned no contract context" }));
          controller.close();
          return;
        }

        // Merge user-provided context when retrying after needMoreInfo
        if (userContext && Object.keys(userContext).length > 0) {
          if (userContext.contractNameOnExplorer) {
            discovery.name = userContext.contractNameOnExplorer;
          }
          (discovery as any).userProvided = userContext;
        }

        // Sufficiency check: when context is too sparse, ask user for more info (skip if userContext provided)
        if (!userContext || Object.keys(userContext).length === 0) {
          if (isInsufficientContext(discovery)) {
            push(sseLine({ type: "narrative", text: "I don't have enough context yet to give you an accurate analysis." }));
            push(sseLine({ type: "needMoreInfo", message: "Please provide any of the following to improve the analysis.", questions: NEED_MORE_INFO_QUESTIONS }));
            controller.close();
            return;
          }
        }

        const typeLabel = discovery.type || "contract";
        const tokenList =
          Array.isArray(discovery.tokens) && discovery.tokens.length > 0
            ? discovery.tokens.map((t: { symbol?: string }) => t.symbol).filter(Boolean).join(", ")
            : "none detected";
        const feedsDetected =
          Array.isArray(discovery.dataFeedsDetected) && discovery.dataFeedsDetected.length > 0
            ? discovery.dataFeedsDetected.map((f: { pairName?: string }) => f.pairName).join(", ")
            : "none";
        push(
          sseLine({
            type: "narrative",
            text: `I've got the contract. It looks like a ${typeLabel}. I see tokens: ${tokenList}; data feeds referenced: ${feedsDetected}. I'll use this to choose which price feeds and risk thresholds to monitor.`,
          })
        );

        let creEntry: Awaited<ReturnType<typeof buildCREConfigFromDiscovery>>;
        let preCREAnalysis: {
          summary?: string;
          keyRisks?: string[];
          recommendations?: string[];
        } = { summary: "", keyRisks: [], recommendations: [] };
        try {
          creEntry = await buildCREConfigFromDiscovery(discovery, suggestedRequest, network, {
            includePreCREAnalysis: true,
          });
        } catch (e) {
          console.error("buildCREConfigFromDiscovery failed", e);
          push(sseLine({ type: "error", message: "Failed to build CRE config from discovery" }));
          controller.close();
          return;
        }
        const entry = "creEntry" in creEntry ? creEntry.creEntry : creEntry;
        if ("preCREAnalysis" in creEntry && creEntry.preCREAnalysis) {
          preCREAnalysis = creEntry.preCREAnalysis;
        }

        const feedNames = entry.priceFeeds.map((f) => f.pairName).join(", ");
        const th = entry.riskThresholds;
        const summarySnippet = preCREAnalysis.summary
          ? preCREAnalysis.summary.slice(0, 180) + (preCREAnalysis.summary.length > 180 ? "…" : "")
          : "Initial risk pass complete.";
        push(
          sseLine({
            type: "narrative",
            text: `I've run an initial risk pass. ${summarySnippet} So I'm choosing these price feeds: ${feedNames}, and setting thresholds: depeg ${th?.depegTolerance ?? 0.02}, volatility ${th?.volatilityMax ?? 0.15}, liquidity drop ${th?.liquidityDropMax ?? 0.25} so we stay on the safe side.`,
          })
        );

        push(
          sseLine({
            type: "narrative",
            text: "Running the Chainlink Risk Engine with those settings.",
          })
        );

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
          push(sseLine({ type: "error", message: `CRE simulation failed: ${errText}` }));
          controller.close();
          return;
        }
        const simulateData = await simulateRes.json();
        const assessments = simulateData.assessments || [];
        const creObservation = assessments[0] || null;

        const riskLevel = creObservation?.riskLevel ?? "LOW";
        const riskScore = creObservation?.riskScore ?? 0;
        push(
          sseLine({
            type: "narrative",
            text: `CRE finished. Risk level: ${riskLevel}, score: ${riskScore}. I'm now turning this into a clear root cause and recommendations for you.`,
          })
        );

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

        push(
          sseLine({
            type: "narrative",
            text: "Synthesizing findings into a summary and actionable steps.",
          })
        );

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
                comparisonWithPreCRE:
                  secondAi.finalAnalysis.comparisonWithPreCRE ?? finalAnalysis.comparisonWithPreCRE,
                recommendations:
                  secondAi.finalAnalysis.recommendations ?? finalAnalysis.recommendations,
                rootCause: secondAi.finalAnalysis.rootCause ?? finalAnalysis.rootCause,
                potentialImpact:
                  secondAi.finalAnalysis.potentialImpact ?? finalAnalysis.potentialImpact,
                nextSteps: secondAi.finalAnalysis.nextSteps ?? finalAnalysis.nextSteps,
                suggestedActions:
                  secondAi.finalAnalysis.suggestedActions ?? finalAnalysis.suggestedActions,
              };
            }
          } catch (e) {
            console.error("Second AI call failed", e);
            const reasoning =
              creObservation?.latestScan?.reasoning ||
              creObservation?.reasoning ||
              "CRE completed.";
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

        const discoveredTokens = Array.isArray(discovery.tokens) && discovery.tokens.length > 0
          ? discovery.tokens.map((t: { address?: string; symbol?: string; decimals?: number }) => ({
              address: (t.address || "").trim(),
              symbol: (t.symbol || "?").trim(),
              decimals: t.decimals,
            })).filter((t: { address: string }) => t.address.length > 0)
          : undefined;
        const result = {
          contractContext,
          initialAnalysis: preCREAnalysis,
          creObservations: creObservation,
          finalAnalysis,
          aiChosenConfig: {
            priceFeedPairs: entry.priceFeeds.map((f) => f.pairName),
            riskThresholds: entry.riskThresholds,
            resolvedPriceFeeds: entry.priceFeeds,
          },
          ...(discoveredTokens?.length ? { discoveredTokens } : {}),
        };
        if (finalAnalysis.summary) {
          push(
            sseLine({
              type: "narrative",
              text: finalAnalysis.summary.slice(0, 200) + (finalAnalysis.summary.length > 200 ? "…" : ""),
            })
          );
        }
        push(sseLine({ type: "result", result }));
        controller.close();
      } catch (error: any) {
        console.error("Analyze stream failed", error);
        push(sseLine({ type: "error", message: error?.message || "Analyze failed" }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
