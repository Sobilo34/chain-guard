/**
 * Server-side HTML and text email templates for risk alerts.
 * Inline CSS only for email client compatibility.
 */

export type DashboardAlertLike = {
  id?: string;
  timestamp: string;
  contract: string;
  contractName?: string;
  description?: string;
  type: string;
  severity: "low" | "medium" | "high";
  status?: string;
  details?: {
    aiSummary?: string;
    keyFindings?: string[];
    recommendations?: string[];
    rootCause?: string;
    potentialImpact?: string;
    nextSteps?: string[];
    suggestedActions?: string[];
    [key: string]: unknown;
  };
};

const APP_NAME = "ChainGuard";
const SEVERITY_COLORS = {
  high: "#dc2626",
  critical: "#b91c1c",
  medium: "#ea580c",
  low: "#ca8a04",
};

function severityColor(severity: string): string {
  const s = (severity || "medium").toLowerCase();
  if (s === "critical") return SEVERITY_COLORS.critical;
  if (s === "high") return SEVERITY_COLORS.high;
  if (s === "medium") return SEVERITY_COLORS.medium;
  return SEVERITY_COLORS.low;
}

function formatTimestamp(ts: string): string {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : d.toLocaleString();
  } catch {
    return ts;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildRiskAlertHtml(
  alert: DashboardAlertLike,
  options?: { dashboardUrl?: string }
): string {
  const url = options?.dashboardUrl || "https://chainguard.sentinel/dashboard/alerts";
  const severity = (alert.severity || "medium").toLowerCase();
  const color = severityColor(severity);
  const contractName = alert.contractName || "Unknown Contract";
  const contractAddr = alert.contract || "—";
  const description = alert.description || "No description provided.";
  const details = alert.details;

  const detailsSection =
    details &&
    (details.aiSummary ||
      (details.keyFindings && details.keyFindings.length) ||
      (details.recommendations && details.recommendations.length) ||
      details.rootCause ||
      details.potentialImpact)
      ? `
    <tr><td style="padding:16px 24px 0;font-family:sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">
        <tr><td style="padding:12px 16px;font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.05em;">Risk analysis</td></tr>
        <tr><td style="padding:0 16px 16px;font-size:14px;line-height:1.5;color:#1f2937;">
          ${details.aiSummary ? `<p style="margin:0 0 12px;">${escapeHtml(details.aiSummary)}</p>` : ""}
          ${details.rootCause ? `<p style="margin:0 0 12px;"><strong>Root cause:</strong> ${escapeHtml(details.rootCause)}</p>` : ""}
          ${details.potentialImpact ? `<p style="margin:0 0 12px;"><strong>Potential impact:</strong> ${escapeHtml(details.potentialImpact)}</p>` : ""}
          ${details.keyFindings && details.keyFindings.length ? `<p style="margin:0 0 6px;"><strong>Key findings:</strong></p><ul style="margin:0 0 12px;padding-left:20px;">${details.keyFindings.map((f) => `<li>${escapeHtml(String(f))}</li>`).join("")}</ul>` : ""}
          ${details.recommendations && details.recommendations.length ? `<p style="margin:0 0 6px;"><strong>Recommendations:</strong></p><ul style="margin:0;padding-left:20px;">${details.recommendations.map((r) => `<li>${escapeHtml(String(r))}</li>`).join("")}</ul>` : ""}
        </td></tr>
      </table>
    </td></tr>`
      : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(APP_NAME)} – Risk Alert</title>
</head>
<body style="margin:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;">
          <tr>
            <td style="padding:24px 24px 16px;text-align:center;">
              <span style="font-size:18px;font-weight:700;color:#111827;">${escapeHtml(APP_NAME)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #e5e7eb;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Risk Alert</h1>
                          <span style="display:inline-block;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;color:#fff;background:${color};">${escapeHtml(severity.toUpperCase())}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">
                      <tr><td style="padding:4px 0;"><strong>Contract</strong></td></tr>
                      <tr><td style="padding:0 0 12px;">${escapeHtml(contractName)}</td></tr>
                      <tr><td style="padding:4px 0;"><strong>Address</strong></td></tr>
                      <tr><td style="padding:0 0 12px;font-family:ui-monospace,monospace;word-break:break-all;">${escapeHtml(contractAddr)}</td></tr>
                      <tr><td style="padding:4px 0;"><strong>Alert type</strong></td></tr>
                      <tr><td style="padding:0 0 12px;">${escapeHtml(alert.type || "Anomaly")}</td></tr>
                      <tr><td style="padding:4px 0;"><strong>Time</strong></td></tr>
                      <tr><td style="padding:0 0 12px;">${escapeHtml(formatTimestamp(alert.timestamp))}</td></tr>
                      <tr><td style="padding:4px 0;"><strong>Description</strong></td></tr>
                      <tr><td style="padding:0 0 12px;line-height:1.5;">${escapeHtml(description)}</td></tr>
                    </table>
                  </td>
                </tr>
                ${detailsSection}
                <tr>
                  <td style="padding:20px 24px 24px;border-top:1px solid #e5e7eb;">
                    <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff !important;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">View in Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;text-align:center;font-size:12px;color:#6b7280;">
              You received this because you enabled email alerts for ${escapeHtml(APP_NAME)}.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildRiskAlertText(
  alert: DashboardAlertLike,
  options?: { dashboardUrl?: string }
): string {
  const url = options?.dashboardUrl || "https://chainguard.sentinel/dashboard/alerts";
  const contractName = alert.contractName || "Unknown Contract";
  const description = alert.description || "No description provided.";
  const details = alert.details;

  let text = `${APP_NAME} – Risk Alert\n`;
  text += `${"=".repeat(40)}\n\n`;
  text += `Severity: ${(alert.severity || "medium").toUpperCase()}\n`;
  text += `Contract: ${contractName}\n`;
  text += `Address: ${alert.contract || "—"}\n`;
  text += `Type: ${alert.type || "Anomaly"}\n`;
  text += `Time: ${formatTimestamp(alert.timestamp)}\n\n`;
  text += `Description:\n${description}\n\n`;

  if (details) {
    if (details.aiSummary) text += `AI Summary:\n${details.aiSummary}\n\n`;
    if (details.rootCause) text += `Root cause: ${details.rootCause}\n\n`;
    if (details.potentialImpact) text += `Potential impact: ${details.potentialImpact}\n\n`;
    if (details.keyFindings?.length) {
      text += `Key findings:\n${details.keyFindings.map((f) => `- ${f}`).join("\n")}\n\n`;
    }
    if (details.recommendations?.length) {
      text += `Recommendations:\n${details.recommendations.map((r) => `- ${r}`).join("\n")}\n\n`;
    }
  }

  text += `View in dashboard: ${url}\n`;
  return text;
}

export const SAMPLE_ALERT: DashboardAlertLike = {
  timestamp: new Date().toISOString(),
  contract: "0x1234567890abcdef1234567890abcdef12345678",
  contractName: "Sample USDC/ETH Pool",
  type: "High Risk Detected",
  description:
    "CRE and AI analysis identified elevated volatility and a significant liquidity drop. Price deviation from the reference feed exceeds the configured threshold.",
  severity: "high",
  status: "active",
  details: {
    aiSummary:
      "The monitored pool shows a 18% volatility spike and a 22% drop in liquidity over the last 24 hours. The CRE price feed comparison indicates a 1.8% deviation from the primary oracle.",
    rootCause:
      "Market volatility and reduced liquidity provision have increased depeg and slippage risk.",
    potentialImpact:
      "Users may experience higher slippage on swaps; in extreme cases, temporary depeg could affect protocol collateralization.",
    keyFindings: [
      "24h volatility above 15% threshold",
      "Liquidity down 22% vs 7-day average",
      "Price deviation 1.8% from Chainlink feed",
    ],
    recommendations: [
      "Consider pausing large withdrawals until volatility subsides",
      "Cross-validate with an additional price feed",
      "Set alerts at 2% deviation for early warning",
    ],
  },
};
