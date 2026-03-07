#!/usr/bin/env node
/**
 * Full Analysis flow — step-by-step script (same as frontend).
 * 1. Send requestRiskAnalysis(contractAddress, chainSelectorName) on CRE consumer (Sepolia)
 * 2. Read requestId from RiskAnalysisRequested event
 * 3. Poll getAssessment(requestId) until filled
 * 4. Print result
 *
 * Usage (from chain-guard):
 *   CONTRACT_ADDRESS=0x... CHAIN_SELECTOR=ethereum-mainnet node scripts/run-full-analysis-flow.mjs
 *
 * Env (use .env.local or export):
 *   NEXT_PUBLIC_CHAINGUARD_CRE_CONSUMER_ADDRESS  — CRE consumer contract (Sepolia)
 *   NEXT_PUBLIC_CRE_CONSUMER_CHAIN_ID=11155111
 *   SEPOLIA_RPC_URL or NEXT_PUBLIC_SEPOLIA_RPC_URL — Sepolia RPC
 *   CRE_REQUEST_PRIVATE_KEY — private key (no 0x prefix ok) to send the tx
 *   CONTRACT_ADDRESS — contract to analyze (e.g. 0xdAC17F958D2ee523a2206206994597C13D831ec7)
 *   CHAIN_SELECTOR — chain name (default: ethereum-mainnet)
 */

import { createPublicClient, createWalletClient, http, parseAbi, decodeEventLog } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eq = trimmed.indexOf("=");
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          const raw = trimmed.slice(eq + 1).trim();
          const value = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
          if (!process.env[key]) process.env[key] = value;
        }
      }
    }
  } catch (_) {}
}
loadEnvFile(join(__dirname, "..", ".env.local"));
loadEnvFile(join(__dirname, "..", ".env"));

const CRE_CONSUMER_ADDRESS = process.env.NEXT_PUBLIC_CHAINGUARD_CRE_CONSUMER_ADDRESS;
const CRE_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CRE_CONSUMER_CHAIN_ID || "11155111");
const RPC_URL = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.CRE_REQUEST_PRIVATE_KEY || process.env.CHAINGUARD_REGISTRY_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const CHAIN_SELECTOR = process.env.CHAIN_SELECTOR || "ethereum-mainnet";

const CONSUMER_ABI = parseAbi([
  "function requestRiskAnalysis(address contractAddress, string chainSelectorName) returns (bytes32 requestId)",
  "function getAssessment(bytes32 requestId) view returns (address contractAddress, string chainSelectorName, uint8 riskLevel, uint256 riskScore, string summary, bool filled)",
  "event RiskAnalysisRequested(bytes32 indexed requestId, address indexed contractAddress, string chainSelectorName, address indexed requester)",
]);

const RISK_LABELS = { 0: "LOW", 1: "MEDIUM", 2: "HIGH", 3: "CRITICAL" };

function log(step, msg) {
  const t = new Date().toISOString().split("T")[1].slice(0, 12);
  console.log(`[${t}] ${step} ${msg}`);
}

async function main() {
  console.log("\n========== Full Analysis flow (same as frontend) ==========\n");

  if (!CRE_CONSUMER_ADDRESS || CRE_CONSUMER_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.error("Missing NEXT_PUBLIC_CHAINGUARD_CRE_CONSUMER_ADDRESS in .env.local");
    process.exit(1);
  }
  if (!RPC_URL) {
    console.error("Missing SEPOLIA_RPC_URL or NEXT_PUBLIC_SEPOLIA_RPC_URL");
    process.exit(1);
  }
  if (!PRIVATE_KEY) {
    console.error("Missing CRE_REQUEST_PRIVATE_KEY or CHAINGUARD_REGISTRY_PRIVATE_KEY (to send tx)");
    process.exit(1);
  }
  const contractToAnalyze = CONTRACT_ADDRESS;
  if (!contractToAnalyze) {
    console.error("Missing CONTRACT_ADDRESS (contract to analyze)");
    process.exit(1);
  }

  const chain = CRE_CHAIN_ID === 11155111 ? sepolia : { id: CRE_CHAIN_ID, name: "Unknown", nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" }, rpcUrls: { default: { http: [RPC_URL] } } };
  const transport = http(RPC_URL);
  const publicClient = createPublicClient({ chain, transport });
  const account = privateKeyToAccount(PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);
  const walletClient = createWalletClient({ account, chain, transport });

  log("1.", "Contract to analyze: " + contractToAnalyze);
  log("1.", "Chain selector: " + CHAIN_SELECTOR);
  log("1.", "CRE consumer: " + CRE_CONSUMER_ADDRESS + " (chain " + CRE_CHAIN_ID + ")\n");

  // Step 2: Submit requestRiskAnalysis tx
  log("2.", "Sending requestRiskAnalysis(contractAddress, chainSelectorName)...");
  const hash = await walletClient.writeContract({
    address: CRE_CONSUMER_ADDRESS,
    abi: CONSUMER_ABI,
    functionName: "requestRiskAnalysis",
    args: [contractToAnalyze, CHAIN_SELECTOR],
    account,
  });
  log("2.", "Tx hash: " + hash);

  // Step 3: Wait for receipt and get requestId from event
  log("3.", "Waiting for transaction receipt...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  log("3.", "Block: " + receipt.blockNumber + ", status: " + receipt.status);

  let requestId = null;
  for (const logEntry of receipt.logs || []) {
    try {
      const decoded = decodeEventLog({
        abi: CONSUMER_ABI,
        data: logEntry.data,
        topics: logEntry.topics,
      });
      if (decoded.eventName === "RiskAnalysisRequested" && decoded.args.requestId) {
        requestId = decoded.args.requestId;
        break;
      }
    } catch (_) {}
  }
  if (!requestId) {
    console.error("Could not find RiskAnalysisRequested event in receipt.");
    process.exit(1);
  }
  log("3.", "Request ID: " + requestId + "\n");

  // Step 4: Poll getAssessment(requestId) until filled
  log("4.", "Polling getAssessment(requestId) every 4s (same as frontend)...");
  const pollIntervalMs = 4000;
  const startWait = Date.now();
  let assessment = null;
  let attempts = 0;
  while (true) {
    const result = await publicClient.readContract({
      address: CRE_CONSUMER_ADDRESS,
      abi: CONSUMER_ABI,
      functionName: "getAssessment",
      args: [requestId],
    });
    attempts++;
    const elapsed = Math.floor((Date.now() - startWait) / 1000);
    const [addr, chainName, riskLevel, riskScore, summary, filled] = result;
    if (filled) {
      assessment = { contractAddress: addr, chainSelectorName: chainName, riskLevel, riskScore, summary, filled };
      log("4.", `Filled after ${attempts} poll(s), ${elapsed}s`);
      break;
    }
    log("4.", `  Poll #${attempts} (${elapsed}s): not filled yet`);
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  // Step 5: Print result
  console.log("\n========== Result (same as frontend would apply) ==========\n");
  console.log("  Contract:    ", assessment.contractAddress);
  console.log("  Chain:      ", assessment.chainSelectorName);
  console.log("  Risk level: ", RISK_LABELS[assessment.riskLevel] ?? assessment.riskLevel);
  console.log("  Risk score: ", assessment.riskScore.toString());
  console.log("  Summary:    ", assessment.summary.slice(0, 200) + (assessment.summary.length > 200 ? "…" : ""));
  console.log("\nDone.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
