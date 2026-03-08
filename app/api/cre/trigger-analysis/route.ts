/**
 * Trigger Full Analysis (requestRiskAnalysis) for monitored contracts at an interval.
 *
 * - Local: Dashboard (or cron) calls this at NEXT_PUBLIC_CHAIN_GUARD_SCAN_INTERVAL_MS.
 *   CRE listener (cre workflow simulate) picks up RiskAnalysisRequested and runs the workflow.
 * - Production: Vercel Cron (or external cron) POSTs here at the same interval.
 *   When CRE is deployed to a DON, the DON picks up the event and runs the workflow.
 *
 * Requires a funded wallet on the CRE consumer chain (e.g. Sepolia):
 *   CRE_AUTOMATION_PRIVATE_KEY or CRE_REQUEST_PRIVATE_KEY in env.
 */

import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { getContracts } from "@/lib/contract-store";
import {
  CHAINGUARD_CRE_CONSUMER_ABI,
  CRE_CONSUMER_ADDRESS,
} from "@/lib/cre-consumer";

const CRE_CONSUMER_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_CRE_CONSUMER_CHAIN_ID || "11155111"
);

function getRpcUrl(): string | null {
  const url =
    process.env.SEPOLIA_RPC_URL ||
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
    (process.env.ALCHEMY_API_KEY
      ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
      : null);
  return url || "https://rpc.sepolia.org";
}

function getAutomationPrivateKey(): `0x${string}` | null {
  const raw =
    process.env.CRE_AUTOMATION_PRIVATE_KEY ||
    process.env.CRE_REQUEST_PRIVATE_KEY;
  if (!raw || !raw.trim()) return null;
  const key = raw.trim();
  return (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;
}

/** GET supported so Vercel Cron (which sends GET) can trigger Full Analysis. */
export async function GET() {
  return runTrigger();
}

export async function POST() {
  return runTrigger();
}

async function runTrigger() {
  const pk = getAutomationPrivateKey();
  if (!pk) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Auto Full Analysis not configured. Set CRE_AUTOMATION_PRIVATE_KEY (or CRE_REQUEST_PRIVATE_KEY) to a funded Sepolia wallet.",
        requested: 0,
      },
      { status: 503 }
    );
  }

  if (
    !CRE_CONSUMER_ADDRESS ||
    CRE_CONSUMER_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "CRE consumer address not configured.",
        requested: 0,
      },
      { status: 503 }
    );
  }

  try {
    const contracts = await getContracts();
    if (contracts.length === 0) {
      return NextResponse.json({
        success: true,
        requested: 0,
        message: "No contracts to analyze.",
      });
    }

    const rpcUrl = getRpcUrl();
    const chain =
      CRE_CONSUMER_CHAIN_ID === 11155111
        ? sepolia
        : {
            id: CRE_CONSUMER_CHAIN_ID,
            name: "CRE Consumer Chain",
            nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
            rpcUrls: { default: { http: [rpcUrl] } },
          };
    const transport = http(rpcUrl);
    const publicClient = createPublicClient({ chain, transport });
    const account = privateKeyToAccount(pk);
    const walletClient = createWalletClient({
      account,
      chain,
      transport,
    });

    let requested = 0;
    const norm = (a: string) =>
      (a || "").toLowerCase().trim().startsWith("0x")
        ? (a || "").toLowerCase().trim()
        : `0x${(a || "").toLowerCase().trim()}`;

    for (const c of contracts) {
      const address = norm(c.address);
      const chainSelectorName =
        c.chainSelectorName || c.chain || "ethereum-mainnet";
      if (!address || address === "0x") continue;
      try {
        const hash = await walletClient.writeContract({
          address: CRE_CONSUMER_ADDRESS,
          abi: CHAINGUARD_CRE_CONSUMER_ABI,
          functionName: "requestRiskAnalysis",
          args: [address as `0x${string}`, chainSelectorName],
          account,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        requested++;
      } catch (err: unknown) {
        console.warn(
          "[trigger-analysis] Failed for",
          address,
          (err as Error)?.message
        );
      }
    }

    return NextResponse.json({
      success: true,
      requested,
      message:
        requested > 0
          ? `Triggered Full Analysis for ${requested} contract(s). CRE (listener or DON) will run the workflow and write reports on-chain.`
          : "No requests submitted (check contract list and RPC).",
    });
  } catch (error: unknown) {
    console.error("[trigger-analysis]", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error)?.message || "Trigger failed",
        requested: 0,
      },
      { status: 500 }
    );
  }
}
