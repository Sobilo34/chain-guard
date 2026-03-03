/**
 * Post-CRE AI: given CRE observation, produce a short comprehensive summary.
 * Used optionally by Force Scan and by the full analyze flow.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type PostCREAnalysis = {
  summary?: string;
  keyFindings?: string[];
  recommendations?: string[];
  rootCause?: string;
  potentialImpact?: string;
  nextSteps?: string[];
  suggestedActions?: string[];
};

async function openRouterJson<T>(prompt: string): Promise<T> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY required");
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
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in response");
  return JSON.parse(match[0]) as T;
}

/**
 * Run post-CRE AI on a single assessment. Returns summary, root cause, impact, and recommendations.
 */
export async function runPostCREAnalysis(creObservation: any): Promise<PostCREAnalysis> {
  const prompt = `You are a DeFi risk analyst. CRE (Chainlink Risk Engine) produced this assessment for a monitored contract:

${JSON.stringify(creObservation, null, 2)}

Provide a "comprehensiveSummary" as a JSON object. Be specific and concrete—never use placeholders like "No root cause identified" or "Impact assessment pending." Use the CRE data to infer real causes, impacts, and actions.

Required:
- "summary": 2-4 sentence overall conclusion (risk level, key metrics, what was proven).
- "keyFindings": array of 3-5 specific points (metrics, violations, price/peg deviations).
- "rootCause": 1-3 sentences on the ROOT CAUSE of the risk (e.g. depeg, oracle deviation, liquidity drop). Infer from CRE.
- "potentialImpact": 1-3 sentences on financial/operational impact (losses, insolvency, TVL at risk).
- "recommendations": array of 4-6 actionable recommendations to mitigate risk (specific, practical).
- "nextSteps": array of 2-4 immediate action items.
- "suggestedActions": array of 2-4 longer-term safeguards and options the user can explore.

Return ONLY a JSON object: { "comprehensiveSummary": { "summary": "...", "keyFindings": [], "rootCause": "...", "potentialImpact": "...", "recommendations": [], "nextSteps": [], "suggestedActions": [] } }`;

  try {
    const out = await openRouterJson<{ comprehensiveSummary?: PostCREAnalysis }>(prompt);
    return out.comprehensiveSummary ?? { summary: "", keyFindings: [], recommendations: [] };
  } catch (e) {
    console.error("Post-CRE AI failed", e);
    const reasoning = creObservation?.latestScan?.reasoning ?? "CRE assessment completed.";
    return {
      summary: reasoning,
      keyFindings: [],
      recommendations: ["Re-run Force Scan for detailed recommendations."],
      rootCause: reasoning,
      potentialImpact: "Review CRE risk level and metrics above for impact.",
      nextSteps: [],
      suggestedActions: [],
    };
  }
}
