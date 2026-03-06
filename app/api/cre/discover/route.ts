import { NextRequest, NextResponse } from "next/server";
import { runDiscovery } from "@/lib/cre/run-discovery";

const DISCOVER_TIMEOUT_MS = 120_000;

export async function POST(req: NextRequest) {
  let address: string;
  let network: string;
  try {
    const body = await req.json();
    address = body?.address;
    network = body?.network ?? "ethereumMainnet";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  const result = await Promise.race([
    runDiscovery(address, network),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Discovery timed out. RPC or explorer may be slow.")), DISCOVER_TIMEOUT_MS)
    ),
  ]).catch((err: any) => {
    console.error("Discovery failed", err);
    return NextResponse.json({ error: err?.message || "Discovery failed" }, { status: err?.message?.includes("timed out") ? 504 : 500 });
  });

  if (result instanceof NextResponse) return result;
  return NextResponse.json(result);
}
