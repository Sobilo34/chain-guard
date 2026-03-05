import { NextRequest, NextResponse } from "next/server";
import { getContracts, setContracts, setAlertEmail, getAlertEmail } from "@/lib/server-store";
import type { DashboardContract } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    let body: { contracts?: DashboardContract[]; alertEmail?: string } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (Array.isArray(body.contracts)) {
      await setContracts(body.contracts);
    }
    if (body.alertEmail !== undefined) {
      const email = typeof body.alertEmail === "string" && body.alertEmail.trim() ? body.alertEmail.trim() : null;
      await setAlertEmail(email);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sync failed", error);
    return NextResponse.json({ error: "Sync failed." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const [contracts, alertEmail] = await Promise.all([getContracts(), getAlertEmail()]);
    return NextResponse.json({ contracts, alertEmail });
  } catch (error) {
    console.error("Get sync data failed", error);
    return NextResponse.json({ error: "Failed to load sync data." }, { status: 500 });
  }
}
