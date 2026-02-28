import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { getDefaultContractsCRE } from "@/lib/default-contracts";

const execAsync = promisify(exec);

// Paths relative to the project root
const CRE_PROJECT_PATH = process.env.CRE_PROJECT_PATH || "/home/bilal/bilal_projects/Hackathons/chainlink/chain-guard-cre";
const SENTINEL_PATH = path.join(CRE_PROJECT_PATH, "chainguard-sentinel");
const CONFIG_PATH = path.join(SENTINEL_PATH, "config.json");

/** Single contract shape for on-demand analyze (AI-derived feeds + thresholds) */
type AnalyzeContract = {
    address: string;
    name: string;
    chainSelectorName: string;
    riskThresholds: { depegTolerance?: number; volatilityMax?: number; liquidityDropMax?: number; collateralRatioMin?: number };
    priceFeeds: Array<{ pairName: string; feedAddress: string; decimals: number }>;
};

export async function POST(req: NextRequest) {
    try {
        let analyzeContract: AnalyzeContract | undefined;
        try {
            const body = await req.json();
            analyzeContract = body?.analyzeContract;
        } catch {
            // empty or invalid JSON is fine
        }

        const defaultContracts = getDefaultContractsCRE();
        const contractsToUse = analyzeContract
            ? [{
                address: analyzeContract.address.toLowerCase().startsWith("0x") ? analyzeContract.address.toLowerCase() : `0x${analyzeContract.address.toLowerCase()}`,
                name: analyzeContract.name,
                chainSelectorName: analyzeContract.chainSelectorName,
                riskThresholds: analyzeContract.riskThresholds || { depegTolerance: 0.02, volatilityMax: 0.15, liquidityDropMax: 0.25, collateralRatioMin: 1.5 },
                alertChannels: ["email"] as const,
                priceFeeds: analyzeContract.priceFeeds?.length ? analyzeContract.priceFeeds : [{ pairName: "ETH/USD", feedAddress: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", decimals: 8 }],
            }]
            : defaultContracts.map((c) => ({ ...c }));

        // 1. Sync config.json with monitored contracts (or single contract for analyze)
        let currentConfig: Record<string, unknown> = {
            openRouterModel: "google/gemini-2.0-flash-001",
            cronSchedule: "*/15 * * * *",
            monitoredContracts: contractsToUse,
            gasLimit: "1000000",
            verboseLogging: true,
            maxContractsPerRun: Math.max(1, contractsToUse.length),
            aiTimeoutMs: 30000,
        };

        if (fs.existsSync(CONFIG_PATH)) {
            try {
                const existing = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
                if (existing.openRouterModel) currentConfig.openRouterModel = existing.openRouterModel;
                if (existing.emailConfig) currentConfig.emailConfig = existing.emailConfig;
            } catch (e) {
                console.error("Failed to parse existing config", e);
            }
        }

        currentConfig.monitoredContracts = contractsToUse;

        // Pass OpenRouter key into config so CRE workflow can use it (config.json is gitignored)
        if (process.env.OPENROUTER_API_KEY) {
            (currentConfig as any).openRouterApiKey = process.env.OPENROUTER_API_KEY;
        }

        fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 2));

        // 2. Execute CRE simulation with .env for private keys and other secrets
        const command = `cre workflow simulate chainguard-sentinel -T local-simulation -e .env`;

        // We execute from the CRE_PROJECT_PATH
        const { stdout, stderr } = await execAsync(command, {
            cwd: CRE_PROJECT_PATH,
            timeout: 60000,
        });

        // 3. Parse assessments from stdout
        const assessments: any[] = [];
        const lines = stdout.split("\n");
        console.log(`Scanning ${lines.length} lines for assessments...`);

        for (const line of lines) {
            const marker = "[SENTINEL_ASSESSMENT]";
            if (line.includes(marker)) {
                const jsonStr = line.substring(line.indexOf(marker) + marker.length).trim();
                let assessment: any;
                try {
                    assessment = JSON.parse(jsonStr);
                } catch {
                    // Salvage when line was truncated: extract key fields so we still get one assessment per contract
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
        console.log(`Found ${assessments.length} valid assessments in simulation output.`);

        // If CRE returned no assessments (e.g. API key missing, timeout), return fallback per expected contract(s)
        let finalAssessments = assessments;
        const fallbackSource = analyzeContract ? contractsToUse : defaultContracts;
        if (assessments.length === 0 && fallbackSource.length > 0) {
            finalAssessments = fallbackSource.map((c: any) => ({
                contractAddress: (c.address || "").toLowerCase().startsWith("0x") ? (c.address || "").toLowerCase() : `0x${(c.address || "").toLowerCase()}`,
                riskLevel: "LOW",
                riskScore: 25,
                latestScan: {
                    reasoning: "CRE run completed but no AI assessment was returned. Check OPENROUTER_API_KEY in .env and CRE logs.",
                    cause: "Simulation completed without OpenRouter output.",
                    consequences: "Dashboard shows fallback status until next successful scan.",
                },
            }));
            console.log(`Returning ${finalAssessments.length} fallback assessments.`);
        }

        return NextResponse.json({
            success: true,
            assessments: finalAssessments,
            rawOutput: stdout,
            errorOutput: stderr,
        });

    } catch (error: any) {
        console.error("CRE Simulation failed", error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stdout: error.stdout,
            stderr: error.stderr,
        }, { status: 500 });
    }
}
