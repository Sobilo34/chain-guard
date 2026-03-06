import { NextRequest, NextResponse } from "next/server";
import { getAlerts } from "@/lib/contract-store";

export async function GET(req: NextRequest) {
  try {
    const alerts = await getAlerts();
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const severity = searchParams.get("severity");
    const address = searchParams.get("address");

    let filtered = alerts;
    if (address) {
      filtered = filtered.filter((a) => a.contract.toLowerCase() === address.toLowerCase());
    }
    if (severity) {
      filtered = filtered.filter((a) => a.severity.toLowerCase() === severity.toLowerCase());
    }

    const total = filtered.length;
    const limit = limitParam ? Math.max(0, parseInt(limitParam, 10)) : 50;
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10)) : 0;
    const sliced = filtered.slice(offset, offset + limit);

    return NextResponse.json({ alerts: sliced, total });
  } catch (error) {
    console.error("Get alerts failed", error);
    return NextResponse.json({ error: "Failed to load alerts." }, { status: 500 });
  }
}
