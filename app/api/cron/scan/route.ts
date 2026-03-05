import { NextRequest, NextResponse } from "next/server";
import { getContracts, getAlertEmail, addAlert, updateAlert } from "@/lib/server-store";
import type { DashboardAlert } from "@/lib/api";

const CRON_SECRET = process.env.CRON_SECRET;

function normalizeAddr(addr: string): string {
  const a = (addr || "").toLowerCase().trim();
  return a.startsWith("0x") ? a : `0x${a}`;
}

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

    const alertEmail = await getAlertEmail();
    const origin =
      req.nextUrl?.origin ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";
    const base = origin.startsWith("http") ? origin : `https://${origin}`;

    const simulateRes = await fetch(`${base}/api/cre/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contracts, runPostCREAi: true }),
    });

    if (!simulateRes.ok) {
      const err = await simulateRes.text();
      return NextResponse.json(
        { error: "Simulate failed", details: err },
        { status: simulateRes.status >= 500 ? 502 : 400 }
      );
    }

    const data = await simulateRes.json();
    const assessments = data.assessments || [];
    let alertsAdded = 0;
    let emailsSent = 0;

    for (const assessment of assessments) {
      const address = normalizeAddr(assessment.contractAddress);
      const riskLevel = (assessment.riskLevel || "LOW").toUpperCase();
      const isHighOrCritical = riskLevel === "HIGH" || riskLevel === "CRITICAL";
      const isMedium = riskLevel === "MEDIUM";

      if (!isHighOrCritical && !isMedium) continue;

      const cs = assessment.comprehensiveSummary;
      const scan = assessment.latestScan || assessment;
      const details =
        cs || scan?.reasoning
          ? {
              aiSummary: cs?.summary ?? scan?.reasoning,
              rootCause: cs?.rootCause ?? scan?.cause,
              potentialImpact: cs?.potentialImpact ?? scan?.consequences ?? scan?.estimatedImpact,
              keyFindings: cs?.keyFindings,
              recommendations: cs?.recommendations ?? (scan?.mitigationStrategy ? [scan.mitigationStrategy] : undefined),
              nextSteps: cs?.nextSteps ?? scan?.nextSteps,
              suggestedActions: cs?.suggestedActions ?? scan?.suggestedActions,
            }
          : undefined;

      const contractName = contracts.find((c) => normalizeAddr(c.address) === address)?.name || "Unknown";
      const alertPayload: Omit<DashboardAlert, "id"> = {
        timestamp: new Date().toISOString(),
        contract: address,
        contractName,
        type: isHighOrCritical ? "High Risk Detected" : "Medium Risk Detected",
        description: scan?.reasoning || (isHighOrCritical ? "AI detected high risk during scan." : "AI detected medium risk during scan."),
        severity: (assessment.riskLevel || "low").toLowerCase() as "low" | "medium" | "high",
        status: "active",
        ...(details && Object.values(details).some(Boolean) ? { details } : {}),
      };

      const newAlert = await addAlert(alertPayload);
      alertsAdded++;

      if (isHighOrCritical && alertEmail && alertEmail.trim()) {
        try {
          const emailRes = await fetch(`${base}/api/notifications/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: alertEmail.trim(),
              alert: { ...alertPayload, id: newAlert.id },
            }),
          });
          if (emailRes.ok) {
            await updateAlert(newAlert.id, {
              notificationHistory: [{ channel: "Email", time: new Date().toISOString(), status: "Sent" }],
            });
            emailsSent++;
          }
        } catch {
          // email failed; alert already stored
        }
      }
    }

    return NextResponse.json({
      success: true,
      contractsScanned: assessments.length,
      alertsAdded,
      emailsSent,
    });
  } catch (error: any) {
    console.error("Cron scan failed", error);
    return NextResponse.json(
      { error: error?.message || "Cron scan failed" },
      { status: 500 }
    );
  }
}
