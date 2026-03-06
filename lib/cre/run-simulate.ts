/**
 * Runs CRE (Chainlink Risk Engine) simulation in-process.
 * Used by /api/cre/simulate and by the analyze stream (avoids self-fetch in production).
 */

import { exec, execSync } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { runPostCREAnalysis } from "@/lib/cre/post-cre-ai";
import { getCronSchedule } from "@/lib/scan-interval";

const execAsync = promisify(exec);

const CRE_PROJECT_PATH =
  process.env.CRE_PROJECT_PATH ||
  path.resolve(process.cwd(), "..", "chain-guard-cre");
const SENTINEL_PATH = path.join(CRE_PROJECT_PATH, "chainguard-sentinel");
const CONFIG_PATH = path.join(SENTINEL_PATH, "config.json");

function normAddr(addr: string): string {
  const a = (addr || "").toLowerCase().trim();
  return a.startsWith("0x") ? a : `0x${a}`;
}

export type AnalyzeContractInput = {
  address: string;
  name: string;
  chainSelectorName: string;
  riskThresholds?: { depegTolerance?: number; volatilityMax?: number; liquidityDropMax?: number; collateralRatioMin?: number };
  priceFeeds: Array<{ pairName: string; feedAddress: string; decimals?: number }>;
};

export type CREAssessment = {
  contractAddress: string;
  riskLevel?: string;
  riskScore?: number;
  latestScan?: { reasoning?: string; cause?: string; consequences?: string };
  comprehensiveSummary?: any;
  [k: string]: unknown;
};

export type SimulateResult = {
  success: boolean;
  assessments: CREAssessment[];
  rawOutput?: string;
  errorOutput?: string;
};

/** Run CRE simulation for a single analyze contract (Full Analysis flow). */
export async function runSimulateForAnalyze(
  analyzeContract: AnalyzeContractInput,
  runPostCREAi = false
): Promise<SimulateResult> {
  const contractsToUse = [
    {
      address: normAddr(analyzeContract.address),
      name: analyzeContract.name,
      chainSelectorName: analyzeContract.chainSelectorName,
      riskThresholds:
        analyzeContract.riskThresholds ||
        { depegTolerance: 0.02, volatilityMax: 0.15, liquidityDropMax: 0.25, collateralRatioMin: 1.5 },
      alertChannels: ["email"] as const,
      priceFeeds: analyzeContract.priceFeeds?.length
        ? analyzeContract.priceFeeds.map((f) => ({
            pairName: f.pairName,
            feedAddress: f.feedAddress,
            decimals: typeof f.decimals === "number" ? f.decimals : 8,
          }))
        : [{ pairName: "ETH/USD", feedAddress: "0x5f4eC3Dd9Bbd43714FE2740F5E3616155c5b8419", decimals: 8 }],
    },
  ];

  const currentConfig: Record<string, unknown> = {
    openRouterModel: "google/gemini-2.0-flash-001",
    cronSchedule: getCronSchedule(),
    monitoredContracts: contractsToUse,
    gasLimit: "1000000",
    verboseLogging: true,
    maxContractsPerRun: 1,
    aiTimeoutMs: 30000,
  };

  if (process.env.OPENROUTER_API_KEY) {
    (currentConfig as any).openRouterApiKey = process.env.OPENROUTER_API_KEY;
  }

  const configDir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 2));

  const command = `cre workflow simulate chainguard-sentinel -T local-simulation -e .env`;

  // #region agent log
  const diag = {
    CRE_PROJECT_PATH,
    configDirExists: fs.existsSync(configDir),
    creProjectExists: fs.existsSync(CRE_PROJECT_PATH),
    cwd: process.cwd(),
    creInPath: "unknown" as string,
  };
  try {
    const whichOut = execSync("which cre 2>/dev/null || echo NOT_FOUND", { encoding: "utf-8", timeout: 2000 }).trim();
    diag.creInPath = whichOut === "NOT_FOUND" || !whichOut ? "NOT_FOUND" : whichOut;
  } catch {
    diag.creInPath = "ERROR_CHECKING";
  }
  fetch("http://127.0.0.1:7346/ingest/d42ab9c2-2ff7-4dad-bbd4-0132f7c8fca3",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"8feba7"},body:JSON.stringify({sessionId:"8feba7",location:"run-simulate.ts:preExec",message:"CRE pre-flight diagnostics",data:diag,timestamp:Date.now(),hypothesisId:"H1"})}).catch(()=>{});
  if (diag.creInPath === "NOT_FOUND" || diag.creInPath === "ERROR_CHECKING") {
    const msg = [
      "CRE (Chainlink Risk Engine) CLI is not installed or not in PATH.",
      "Full Analysis requires the `cre` command. Install it with: npm install -g @chainlink/cre",
      "In serverless/hosted deployments (e.g. Pxxl, Vercel), subprocess execution is not supported—run Full Analysis locally or use a self-hosted backend with CRE installed.",
      `Diagnostics: cwd=${diag.cwd} CRE_PROJECT_PATH=${diag.CRE_PROJECT_PATH} projectExists=${diag.creProjectExists}`,
    ].join(" ");
    throw new Error(msg);
  }
  // #endregion

  let stdout = "";
  let stderr = "";
  try {
    const result = await execAsync(command, {
      cwd: CRE_PROJECT_PATH,
      timeout: 60000,
    });
    stdout = result.stdout || "";
    stderr = result.stderr || "";
  } catch (err: any) {
    stdout = err.stdout || "";
    stderr = err.stderr || "";
    console.error("CRE exec failed", err);
    fetch("http://127.0.0.1:7346/ingest/d42ab9c2-2ff7-4dad-bbd4-0132f7c8fca3",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"8feba7"},body:JSON.stringify({sessionId:"8feba7",location:"run-simulate.ts:execCatch",message:"CRE exec failed",data:{error:err?.message,stdout:typeof stdout==="string"?stdout?.slice(0,200):"",stderr:typeof stderr==="string"?stderr?.slice(0,200):""},timestamp:Date.now(),hypothesisId:"H2"})}).catch(()=>{});
    throw new Error(err?.message || "CRE simulation failed");
  }

  const assessments: CREAssessment[] = [];
  const lines = stdout.split("\n");

  for (const line of lines) {
    const marker = "[SENTINEL_ASSESSMENT]";
    if (line.includes(marker)) {
      const jsonStr = line.substring(line.indexOf(marker) + marker.length).trim();
      let assessment: CREAssessment | null;
      try {
        assessment = JSON.parse(jsonStr);
      } catch {
        const addrMatch = jsonStr.match(/"contractAddress"\s*:\s*"([^"]+)"/);
        const riskMatch = jsonStr.match(/"riskLevel"\s*:\s*"([^"]+)"/);
        const scoreMatch = jsonStr.match(/"riskScore"\s*:\s*(\d+)/);
        const reasonMatch = jsonStr.match(/"reasoning"\s*:\s*"([^"]*)"/);
        const contractAddress = addrMatch?.[1]?.toLowerCase().trim() || "";
        if (contractAddress && (contractAddress.startsWith("0x") || contractAddress.length >= 40)) {
          assessment = {
            contractAddress: contractAddress.startsWith("0x") ? contractAddress : `0x${contractAddress}`,
            riskLevel: riskMatch?.[1] || "LOW",
            riskScore: scoreMatch ? parseInt(scoreMatch[1], 10) : 25,
            latestScan: { reasoning: reasonMatch?.[1] || "Assessment line truncated; partial data applied." },
          };
        } else {
          assessment = null;
        }
      }
      if (assessment) {
        if (assessment.contractAddress) {
          assessment.contractAddress = assessment.contractAddress.toLowerCase().trim();
          if (!assessment.contractAddress.startsWith("0x")) {
            assessment.contractAddress = `0x${assessment.contractAddress}`;
          }
        }
        assessments.push(assessment);
      }
    }
  }

  let finalAssessments = assessments;
  if (assessments.length === 0) {
    finalAssessments = [
      {
        contractAddress: normAddr(analyzeContract.address),
        riskLevel: "LOW",
        riskScore: 25,
        latestScan: {
          reasoning:
            "CRE run completed but no AI assessment was returned. Check OPENROUTER_API_KEY in .env and CRE logs.",
          cause: "Simulation completed without OpenRouter output.",
          consequences: "Dashboard shows fallback status until next successful scan.",
        },
      },
    ];
  }

  if (runPostCREAi && finalAssessments.length > 0 && process.env.OPENROUTER_API_KEY) {
    try {
      const summary = await runPostCREAnalysis(finalAssessments[0]);
      (finalAssessments[0] as any).comprehensiveSummary = summary;
    } catch (e) {
      console.error("Post-CRE AI failed", e);
    }
  }

  return {
    success: true,
    assessments: finalAssessments,
    rawOutput: stdout,
    errorOutput: stderr,
  };
}
