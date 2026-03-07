import { NextRequest, NextResponse } from "next/server";
import { getContracts } from "@/lib/contract-store";

const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(req: NextRequest): boolean {
  if (!CRON_SECRET) return true;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7) === CRON_SECRET;
  const key = req.nextUrl.searchParams.get("key");
  return key === CRON_SECRET;
}

export async function GET(req: NextRequest) {
  return runScan(req);
}

export async function POST(req: NextRequest) {
  return runScan(req);
}

async function runScan(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contracts = await getContracts();
    if (contracts.length === 0) {
      return NextResponse.json({ message: "No contracts", alertsAdded: 0, emailsSent: 0 });
    }

    // CRE is fully on-chain: no backend CRE API. Use Full Analysis per contract (smart contract → CRE).
    return NextResponse.json({
      success: true,
      message: "CRE runs on-chain only. Use Full Analysis on each contract for risk analysis.",
      contractsScanned: 0,
      alertsAdded: 0,
      emailsSent: 0,
    });
  } catch (error: any) {
    console.error("Cron scan failed", error);
    return NextResponse.json(
      { error: error?.message || "Cron scan failed" },
      { status: 500 }
    );
  }
}
