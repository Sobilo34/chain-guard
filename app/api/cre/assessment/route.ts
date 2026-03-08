/**
 * Read on-chain CRE assessment by requestId. Used by the dashboard to poll for
 * cron/trigger-analysis results and update each contract's lastUpdate.
 */

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import {
  CRE_CONSUMER_ADDRESS,
  CRE_CONSUMER_CHAIN_ID,
  parseOnchainAssessment,
  type OnchainAssessment,
} from "@/lib/cre-consumer";
import { CHAINGUARD_CRE_CONSUMER_ABI } from "@/lib/cre-consumer-abi";

function getRpcUrl(): string {
  const url =
    process.env.SEPOLIA_RPC_URL ||
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
    (process.env.ALCHEMY_API_KEY
      ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
      : null);
  return url || "https://rpc.sepolia.org";
}

export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get("requestId");
  if (!requestId || !requestId.startsWith("0x") || requestId.length !== 66) {
    return NextResponse.json(
      { error: "requestId required (bytes32 hex, e.g. 0x...)" },
      { status: 400 }
    );
  }

  if (
    !CRE_CONSUMER_ADDRESS ||
    CRE_CONSUMER_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    return NextResponse.json(
      { error: "CRE consumer address not configured" },
      { status: 503 }
    );
  }

  try {
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
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const data = await publicClient.readContract({
      address: CRE_CONSUMER_ADDRESS,
      abi: CHAINGUARD_CRE_CONSUMER_ABI,
      functionName: "getAssessment",
      args: [requestId as `0x${string}`],
    });

    if (!data || !Array.isArray(data) || data.length < 6) {
      return NextResponse.json({ assessment: null });
    }

    const assessment: OnchainAssessment = parseOnchainAssessment(
      data as readonly [string, string, number, bigint, string, boolean]
    );

    return NextResponse.json({
      assessment: assessment.filled ? assessment : null,
    });
  } catch (e) {
    console.error("[assessment] read failed", e);
    return NextResponse.json(
      { error: (e as Error)?.message || "Read failed" },
      { status: 500 }
    );
  }
}
