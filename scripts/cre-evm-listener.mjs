#!/usr/bin/env node
/**
 * CRE EVM listener for local/MVP testing.
 * Watches the consumer contract for RiskAnalysisRequested events; when one is seen,
 * runs "cre workflow simulate ... --evm-tx-hash <tx> --broadcast" so the report is written.
 *
 * Run this in a separate terminal so that when you click "Full Analysis" in the app,
 * the workflow runs automatically and the report appears without pasting a tx hash.
 *
 * Usage (from chain-guard):
 *   node scripts/cre-evm-listener.mjs
 *
 * Requires: CRE CLI (cre) in PATH, chain-guard-cre repo next to chain-guard (or set CRE_PROJECT_PATH).
 */

import { createPublicClient, http, keccak256, toBytes, decodeEventLog, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawn } from "child_process";

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
const RPC_URL = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
const CRE_PROJECT_PATH = process.env.CRE_PROJECT_PATH || join(__dirname, "..", "..", "chain-guard-cre");

const eventTopic = keccak256(toBytes("RiskAnalysisRequested(bytes32,address,string,address)"));
const RISK_ANALYSIS_REQUESTED_ABI = parseAbi([
  "event RiskAnalysisRequested(bytes32 indexed requestId, address indexed contractAddress, string chainSelectorName, address indexed requester)",
]);

async function main() {
  if (!CRE_CONSUMER_ADDRESS || CRE_CONSUMER_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.error("Set NEXT_PUBLIC_CHAINGUARD_CRE_CONSUMER_ADDRESS in .env.local");
    process.exit(1);
  }
  if (!RPC_URL) {
    console.error("Set SEPOLIA_RPC_URL or NEXT_PUBLIC_SEPOLIA_RPC_URL in .env.local");
    process.exit(1);
  }

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });

  const workflowDir = join(CRE_PROJECT_PATH, "chainguard-sentinel");
  const workflowPath = workflowDir;
  try {
    readFileSync(join(workflowDir, "workflow.yaml"), "utf8");
  } catch (e) {
    console.error("CRE workflow not found at", workflowPath, "(set CRE_PROJECT_PATH if chain-guard-cre is elsewhere)");
    process.exit(1);
  }

  console.log("\n[CRE listener] Watching for RiskAnalysisRequested on", CRE_CONSUMER_ADDRESS, "(Sepolia)");
  console.log("[CRE listener] When you run Full Analysis in the app, this will run the workflow and write the report.\n");

  let lastBlock = null;
  const processedTx = new Set();

  async function poll() {
    try {
      const block = await publicClient.getBlockNumber();
      if (lastBlock == null) lastBlock = block;
      const fromBlock = lastBlock + 1n;
      if (fromBlock > block) {
        setTimeout(poll, 8000);
        return;
      }
      const logs = await publicClient.getLogs({
        address: CRE_CONSUMER_ADDRESS,
        topics: [eventTopic],
        fromBlock,
        toBlock: block,
      });
      for (const log of logs) {
        const txHash = log.transactionHash;
        if (processedTx.has(txHash)) continue;
        try {
          const decoded = decodeEventLog({
            abi: RISK_ANALYSIS_REQUESTED_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName !== "RiskAnalysisRequested") continue;
        } catch {
          continue;
        }
        processedTx.add(txHash);
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
        let eventIndex = 0;
        if (receipt && receipt.logs) {
          const idx = receipt.logs.findIndex((l) => l.logIndex === log.logIndex && l.transactionHash === txHash);
          if (idx >= 0) eventIndex = idx;
        }
        console.log("[CRE listener] New event in tx", txHash, "— running CRE workflow...");
        runSimulate(txHash, eventIndex);
      }
      lastBlock = block;
    } catch (e) {
      console.error("[CRE listener] Poll error:", e.message);
    }
    setTimeout(poll, 8000);
  }

  let creEnv = { ...process.env };
  try {
    const creEnvPath = join(CRE_PROJECT_PATH, ".env");
    const content = readFileSync(creEnvPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const eq = trimmed.indexOf("=");
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim().replace(/\s/g, "");
        if (key === "CRE_ETH_PRIVATE_KEY" && value) {
          if (!value.startsWith("0x")) value = "0x" + value;
          if (value.length !== 66) value = value.slice(0, 66);
        }
        creEnv[key] = value;
      }
    }
  } catch (_) {}
  // Use Alchemy key from chain-guard-cre/.env or chain-guard .env.local so CRE RPCs work
  creEnv.ALCHEMY_API_KEY = creEnv.ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY;

  const configPath = join(CRE_PROJECT_PATH, "chainguard-sentinel", "config.evm-triggered.json");
  const projectYamlPath = join(CRE_PROJECT_PATH, "project.yaml");

  function runSimulate(txHash, evmEventIndex) {
    let originalConfig = null;
    try {
      originalConfig = readFileSync(configPath, "utf8");
      const config = JSON.parse(originalConfig);
      if (creEnv.OPENROUTER_API_KEY) config.openRouterApiKey = creEnv.OPENROUTER_API_KEY;
      writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (e) {
      console.warn("[CRE listener] Could not inject OPENROUTER_API_KEY into config:", e.message);
    }

    // CRE project.yaml does not expand env vars; patch in Alchemy key so RPCs don't 401
    let originalProjectYaml = null;
    const alchemyKey = creEnv.ALCHEMY_API_KEY;
    if (alchemyKey) {
      try {
        originalProjectYaml = readFileSync(projectYamlPath, "utf8");
        const patched = originalProjectYaml.replace(/YOUR_ALCHEMY_API_KEY/g, alchemyKey);
        writeFileSync(projectYamlPath, patched);
      } catch (e) {
        console.warn("[CRE listener] Could not patch project.yaml with ALCHEMY_API_KEY:", e.message);
      }
    } else {
      console.warn("[CRE listener] ALCHEMY_API_KEY not set in chain-guard-cre/.env or .env.local — RPC may 401.");
    }

    const creEnvPath = join(CRE_PROJECT_PATH, ".env");
    const args = [
      "workflow", "simulate",
      workflowPath,
      "-T", "evm-triggered",
      "-e", creEnvPath,
      "--non-interactive",
      "--trigger-index", "0",
      "--evm-tx-hash", txHash,
      "--evm-event-index", String(evmEventIndex),
      "--broadcast",
    ];
    const child = spawn("cre", args, {
      cwd: CRE_PROJECT_PATH,
      stdio: "inherit",
      shell: true,
      env: creEnv,
    });
    child.on("exit", (code) => {
      if (originalConfig != null) {
        try {
          writeFileSync(configPath, originalConfig);
        } catch (_) {}
      }
      if (originalProjectYaml != null) {
        try {
          writeFileSync(projectYamlPath, originalProjectYaml);
        } catch (_) {}
      }
      if (code === 0) console.log("[CRE listener] Workflow finished for", txHash);
      else console.log("[CRE listener] Workflow exited with code", code);
    });
  }

  poll();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
