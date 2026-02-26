import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

// Paths relative to the project root
const CRE_PROJECT_PATH = "/home/bilal/bilal_projects/Hackathons/chainlink/chain-guard-cre";
const SENTINEL_PATH = path.join(CRE_PROJECT_PATH, "chainguard-sentinel");
const CONFIG_PATH = path.join(SENTINEL_PATH, "config.json");

export async function POST(req: NextRequest) {
    try {
        const { contracts, geminiApiKey } = await req.json();

        if (!contracts || !Array.isArray(contracts)) {
            return NextResponse.json({ error: "Invalid contracts payload" }, { status: 400 });
        }

        // 1. Sync config.json with current contracts
        // Use the existing config as template to preserve settings
        let currentConfig = {
            geminiModel: "gemini-2.0-flash",
            cronSchedule: "*/15 * * * *",
            monitoredContracts: [],
            gasLimit: "1000000",
            verboseLogging: true,
            maxContractsPerRun: 10,
            geminiTimeoutMs: 30000
        };

        if (fs.existsSync(CONFIG_PATH)) {
            try {
                currentConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
            } catch (e) {
                console.error("Failed to parse existing config", e);
            }
        }

        currentConfig.monitoredContracts = contracts.map((c: any) => ({
            address: c.address,
            name: c.name || "Unknown",
            chainSelectorName: c.chainSelectorName || "ethereum-mainnet",
            riskThresholds: c.riskThresholds || {
                depegTolerance: 0.02,
                volatilityMax: 0.15,
                liquidityDropMax: 0.25,
                collateralRatioMin: 1.5,
            },
            alertChannels: c.alertChannels || ["email"],
            priceFeeds: c.priceFeeds || [],
        })) as any;

        // Ensure current API key is available in config for the simulation
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
                try {
                    const jsonStr = line.substring(line.indexOf(marker) + marker.length).trim();
                    const assessment = JSON.parse(jsonStr);
                    // Standardize address for frontend mapping
                    if (assessment.contractAddress) {
                        assessment.contractAddress = assessment.contractAddress.toLowerCase().trim();
                        if (!assessment.contractAddress.startsWith("0x")) {
                            assessment.contractAddress = `0x${assessment.contractAddress}`;
                        }
                    }
                    assessments.push(assessment);
                } catch (e) {
                    console.error("Failed to parse assessment line", e);
                }
            }
        }
        console.log(`Found ${assessments.length} valid assessments in simulation output.`);

        return NextResponse.json({
            success: true,
            assessments,
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
