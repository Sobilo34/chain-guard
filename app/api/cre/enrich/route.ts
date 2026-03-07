import { NextRequest, NextResponse } from "next/server";

/** Enrich on-chain CRE summary into full finalAnalysis (executive summary, root cause, recommendations). Non-blocking for the user. */
const ENRICH_TIMEOUT_MS = 25_000;

async function openRouterJson<T>(prompt: string): Promise<T> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is required for enrich");
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
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in AI response");
  return JSON.parse(match[0]) as T;
}

type EnrichBody = {
  summary: string;
  riskLevel: string;
  riskScore: string;
  contractAddress: string;
  chainSelectorName?: string;
  contractName?: string;
};

type EnrichResponse = {
  finalAnalysis: {
    summary?: string;
    keyFindings?: string[];
    comparisonWithPreCRE?: string;
    rootCause?: string;
    potentialImpact?: string;
    recommendations?: string[];
    nextSteps?: string[];
    suggestedActions?: string[];
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EnrichBody;
    const {
      summary,
      riskLevel,
      riskScore,
      contractAddress,
      chainSelectorName = "ethereum-mainnet",
      contractName = "Contract",
    } = body;
    if (!summary && !riskLevel) {
      return NextResponse.json({ error: "summary or riskLevel required" }, { status: 400 });
    }

    const prompt = `You are a smart contract risk analyst. Below is a short on-chain risk assessment. Expand it into a detailed but concise report.

ON-CHAIN ASSESSMENT:
- Contract: ${contractName} at ${contractAddress} (${chainSelectorName})
- Risk level: ${riskLevel}
- Risk score: ${riskScore}/100
- Summary: ${summary || "No summary."}

Return a JSON object with one key "finalAnalysis" containing:
- "summary": 2-4 sentence executive summary (overall risk, key takeaway). Be specific.
- "keyFindings": array of 3-6 specific findings (infer from risk level and summary; include metrics, deviations, or contract behavior).
- "comparisonWithPreCRE": 1-2 sentences on how this on-chain result compares to what a pre-CRE check might have suggested (e.g. confirms low risk, or adds new findings).
- "rootCause": 1-3 sentences on the root cause of the identified risk. Never say "No root cause"—infer from the summary and risk level.
- "potentialImpact": 1-3 sentences on financial and operational impact. Be concrete (e.g. user losses, protocol exposure).
- "recommendations": array of 4-6 actionable recommendations (specific, practical). Include monitoring, thresholds, and mitigations.
- "nextSteps": array of 2-4 immediate action items.
- "suggestedActions": array of 2-4 longer-term safeguards.

Be specific and practical. Return ONLY valid JSON: { "finalAnalysis": { ... } }`;

    const out = await Promise.race([
      openRouterJson<EnrichResponse>(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Enrich timeout")), ENRICH_TIMEOUT_MS)
      ),
    ]);
    return NextResponse.json(out?.finalAnalysis ?? {});
  } catch (error: any) {
    console.error("Enrich failed", error);
    return NextResponse.json(
      { error: error?.message || "Enrich failed" },
      { status: 500 }
    );
  }
}
