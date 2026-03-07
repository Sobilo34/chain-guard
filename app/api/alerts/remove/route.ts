import { NextRequest, NextResponse } from "next/server";
import { deleteAlert } from "@/lib/contract-store";

/** Soft-delete an alert; it disappears from dashboard and Alert Feeds. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const alertId = body?.alertId ?? body?.id;
    if (!alertId || typeof alertId !== "string") {
      return NextResponse.json({ error: "alertId required" }, { status: 400 });
    }
    const removed = await deleteAlert(alertId);
    return NextResponse.json({ success: removed });
  } catch (error) {
    console.error("Delete alert failed", error);
    return NextResponse.json({ error: "Failed to delete alert." }, { status: 500 });
  }
}
