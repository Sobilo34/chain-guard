import { NextRequest } from "next/server";
import {
  buildRiskAlertHtml,
  buildRiskAlertText,
  SAMPLE_ALERT,
  type DashboardAlertLike,
} from "@/lib/email-templates/risk-alert";

const RESEND_API_URL = "https://api.resend.com/emails";

const DEFAULT_FROM = "ChainGuard <onboarding@resend.dev>";

/** Resend accepts: "email@example.com" or "Name <email@example.com>". Must contain a valid email. */
function getFromEmail(): string {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) return DEFAULT_FROM;
  // Reject API keys or non-email values (e.g. RESEND_FROM_EMAIL set to RESEND_API_KEY by mistake)
  if (from.startsWith("re_") || !from.includes("@")) return DEFAULT_FROM;
  // Must look like either "email@domain.tld" or "Name <email@domain.tld>"
  const emailPart = from.includes("<") && from.includes(">") ? from.replace(/^.*<([^>]+)>.*$/, "$1") : from;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPart.trim())) return DEFAULT_FROM;
  return from;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: "Email not configured. Set RESEND_API_KEY to enable alerts." },
      { status: 503 }
    );
  }

  let body: { to?: string; alert?: DashboardAlertLike; test?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return Response.json({ error: "Valid 'to' email is required." }, { status: 400 });
  }

  const isTest = body.test === true;
  const alert: DashboardAlertLike | undefined = isTest ? SAMPLE_ALERT : body.alert;

  if (!isTest && !alert) {
    return Response.json(
      { error: "Either provide 'alert' or set test: true." },
      { status: 400 }
    );
  }

  const subject = isTest
    ? "ChainGuard – Test risk alert"
    : `ChainGuard – Risk alert: ${alert?.contractName || alert?.contract || "Contract"}`;

  const origin =
    req.nextUrl?.origin ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "https://chainguard.sentinel";
  const dashboardUrl = `${origin}/dashboard/alerts`;

  const html = buildRiskAlertHtml(alert!, { dashboardUrl });
  const text = buildRiskAlertText(alert!, { dashboardUrl });

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getFromEmail(),
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    return Response.json(
      { error: err.message || "Failed to send email." },
      { status: res.status >= 500 ? 503 : 400 }
    );
  }

  const data = await res.json().catch(() => ({}));
  return Response.json({
    success: true,
    message: isTest ? "Test email sent." : "Alert email sent.",
    id: data.id,
  });
}
