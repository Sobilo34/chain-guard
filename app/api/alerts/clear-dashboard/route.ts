import { NextResponse } from "next/server";
import { getAlerts, updateAlert } from "@/lib/contract-store";

/** Acknowledge all active alerts so the dashboard shows "clear". Does not delete; alerts remain in Alert Feeds. */
export async function POST() {
  try {
    const alerts = await getAlerts();
    const active = alerts.filter((a) => (a.status || "active").toLowerCase() === "active");
    let acknowledged = 0;
    for (const a of active) {
      const updated = await updateAlert(a.id, { status: "acknowledged" });
      if (updated) acknowledged++;
    }
    return NextResponse.json({ success: true, acknowledged });
  } catch (error) {
    console.error("Clear dashboard failed", error);
    return NextResponse.json({ error: "Failed to clear dashboard." }, { status: 500 });
  }
}
