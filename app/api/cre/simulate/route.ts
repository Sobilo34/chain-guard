import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { buildCREConfigFromDiscovery, chainSelectorToNetwork } from "@/lib/cre/build-config";
import { runPostCREAnalysis } from "@/lib/cre/post-cre-ai";

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

/** Contract input from app (address + network required; rest optional from cache) */
type ContractInput = {
    address: string;
    chain?: string;
    chainSelectorName?: string;
    name?: string;
    priceFeeds?: Array<{ pairName: string; feedAddress: string; decimals?: number }>;
    riskThresholds?: Record<string, number>;
};

function normAddr(addr: string): string {
    const a = (addr || "").toLowerCase().trim();
    return a.startsWith("0x") ? a : `0x${a}`;
}

function hasFullConfig(c: ContractInput): boolean {
    return !!(c.address && c.chainSelectorName && Array.isArray(c.priceFeeds) && c.priceFeeds.length > 0 && c.riskThresholds && typeof c.riskThresholds === "object");
}

function toCREEntry(c: ContractInput): {
    address: string;
    name: string;
    chainSelectorName: string;
    riskThresholds: Record<string, number>;
    alertChannels: readonly string[];
    priceFeeds: Array<{ pairName: string; feedAddress: string; decimals: number }>;
} {
    const defaultFeeds = [{ pairName: "ETH/USD", feedAddress: "0x5f4eC3Dd9Bbd43714FE2740F5E3616155c5b8419", decimals: 8 }];
    const feeds = Array.isArray(c.priceFeeds) && c.priceFeeds.length > 0
        ? c.priceFeeds.map((f) => ({ pairName: f.pairName, feedAddress: f.feedAddress, decimals: typeof f.decimals === "number" ? f.decimals : 8 }))
        : defaultFeeds;
    return {
        address: normAddr(c.address),
        name: c.name || "Unknown",
        chainSelectorName: c.chainSelectorName || "ethereum-mainnet",
        riskThresholds: c.riskThresholds || { depegTolerance: 0.02, volatilityMax: 0.15, liquidityDropMax: 0.25, collateralRatioMin: 1.5 },
        alertChannels: ["email"],
        priceFeeds: feeds,
    };
}

export async function POST(req: NextRequest) {
    try {
        let body: { analyzeContract?: AnalyzeContract; contracts?: ContractInput[]; runPostCREAi?: boolean } = {};
        try {
            body = await req.json();
        } catch {
            // empty or invalid JSON
        }

        const analyzeContract = body?.analyzeContract;
        const runPostCREAi = body?.runPostCREAi === true;
        const contractsFromBody = Array.isArray(body?.contracts) ? body.contracts : [];

        let contractsToUse: Array<{
            address: string;
            name: string;
            chainSelectorName: string;
            riskThresholds: Record<string, number>;
            alertChannels: readonly string[];
            priceFeeds: Array<{ pairName: string; feedAddress: string; decimals: number }>;
        }>;

        if (analyzeContract) {
            contractsToUse = [{
                address: normAddr(analyzeContract.address),
                name: analyzeContract.name,
                chainSelectorName: analyzeContract.chainSelectorName,
                riskThresholds: analyzeContract.riskThresholds || { depegTolerance: 0.02, volatilityMax: 0.15, liquidityDropMax: 0.25, collateralRatioMin: 1.5 },
                alertChannels: ["email"],
                priceFeeds: analyzeContract.priceFeeds?.length ? analyzeContract.priceFeeds : [{ pairName: "ETH/USD", feedAddress: "0x5f4eC3Dd9Bbd43714FE2740F5E3616155c5b8419", decimals: 8 }],
            }];
        } else if (contractsFromBody.length > 0) {
            const origin = req.nextUrl?.origin || (process.env.NEXTAUTH_URL && (process.env.NEXTAUTH_URL.startsWith("http") ? process.env.NEXTAUTH_URL : `https://${process.env.NEXTAUTH_URL}`)) || "http://localhost:3000";
            const discoverUrl = `${origin}/api/cre/discover`;

            contractsToUse = [];
            for (const c of contractsFromBody) {
                if (!c.address) continue;
                const chainSelectorName = c.chainSelectorName || (c.chain === "ethereumMainnet" ? "ethereum-mainnet" : c.chain === "polygonMainnet" ? "polygon-mainnet" : c.chain === "arbitrumMainnet" ? "arbitrum-mainnet" : c.chain === "optimismMainnet" ? "optimism-mainnet" : c.chain === "baseMainnet" ? "base-mainnet" : "ethereum-mainnet");
                const network = chainSelectorToNetwork(chainSelectorName);

                if (hasFullConfig(c)) {
                    contractsToUse.push(toCREEntry({ ...c, chainSelectorName }));
                    continue;
                }

                try {
                    const discoverRes = await fetch(discoverUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ address: c.address, network }),
                    });
                    if (!discoverRes.ok) {
                        console.error(`Discovery failed for ${c.address}: ${discoverRes.status}`);
                        contractsToUse.push(toCREEntry({ ...c, chainSelectorName }));
                        continue;
                    }
                    const discoverData = await discoverRes.json();
                    const discovery = discoverData.discovery;
                    const suggestedRequest = discoverData.suggestedRequest;
                    if (!discovery) {
                        contractsToUse.push(toCREEntry({ ...c, chainSelectorName }));
                        continue;
                    }
                    const entry = await buildCREConfigFromDiscovery(discovery, suggestedRequest, network);
                    contractsToUse.push(entry);
                } catch (e) {
                    console.error(`Failed to build config for ${c.address}`, e);
                    contractsToUse.push(toCREEntry({ ...c, chainSelectorName }));
                }
            }
        } else {
            return NextResponse.json(
                { error: "No contracts provided. Add contracts in the dashboard (address + network) and run Force Scan." },
                { status: 400 }
            );
        }

        // 1. Sync config.json with monitored contracts (or single contract for analyze)
        let currentConfig: Record<string, unknown> = {
            openRouterModel: "google/gemini-2.0-flash-001",
            cronSchedule: "*/15 * * * *",
            monitoredContracts: contractsToUse,
            gasLimit: "1000000",
            verboseLogging: true,
            maxContractsPerRun: Math.max(1, Math.min(contractsToUse.length, 50)),
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
        if (assessments.length === 0 && contractsToUse.length > 0) {
            finalAssessments = contractsToUse.map((c) => ({
                contractAddress: normAddr(c.address),
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

        if (runPostCREAi && finalAssessments.length > 0 && process.env.OPENROUTER_API_KEY) {
            const limit = Math.min(finalAssessments.length, 5);
            for (let i = 0; i < limit; i++) {
                try {
                    const summary = await runPostCREAnalysis(finalAssessments[i]);
                    (finalAssessments[i] as any).comprehensiveSummary = summary;
                } catch (e) {
                    console.error("Post-CRE AI for assessment", i, e);
                }
            }
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
