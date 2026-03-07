import { NextRequest, NextResponse } from "next/server";
import { updateAlert } from "@/lib/contract-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const alertId = body?.alertId ?? body?.id;
    if (!alertId || typeof alertId !== "string") {
      return NextResponse.json({ error: "alertId required" }, { status: 400 });
    }
    const updated = await updateAlert(alertId, { status: "resolved" });
    return NextResponse.json({ success: !!updated });
  } catch (error) {
    console.error("Resolve alert failed", error);
    return NextResponse.json({ error: "Failed to resolve alert." }, { status: 500 });
  }
}
