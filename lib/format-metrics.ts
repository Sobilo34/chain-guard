/**
 * Format portfolio metrics for display with correct precision.
 * Values are expected in USD (dollars). Handles small and large amounts.
 */

export function formatTvl(dollars: number | undefined | null): string {
  if (dollars == null || !Number.isFinite(dollars) || dollars < 0) return "$0.00";
  // If value is huge, might be in wei/smallest unit (e.g. 1e18); convert to dollars
  let value = dollars;
  if (value >= 1e15) value = value / 1e18; // assume wei
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}k`;
  return `$${value.toFixed(2)}`;
}

export function formatVolume(dollars: number | undefined | null): string {
  if (dollars == null || !Number.isFinite(dollars) || dollars < 0) return "$0.00";
  let value = dollars;
  if (value >= 1e15) value = value / 1e18;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}k`;
  return `$${value.toFixed(2)}`;
}

export function formatPrice(price: number | undefined | null): string {
  if (price == null || !Number.isFinite(price) || price < 0) return "$0.00";
  if (price >= 1e6) return `$${(price / 1e6).toFixed(2)}M`;
  if (price >= 1e3) return `$${(price / 1e3).toFixed(2)}k`;
  return `$${price.toFixed(2)}`;
}

export function formatLiquidityPercent(pct: number | undefined | null): string {
  if (pct == null || !Number.isFinite(pct)) return "0%";
  const val = pct > 100 ? pct : pct <= 1 ? pct * 100 : pct;
  return `${Math.min(100, Math.max(0, Math.round(val)))}%`;
}

/**
 * Format ISO sync timestamp for dashboard (human-readable date and time).
 * e.g. "2026-02-28T21:23:07.818Z" → "Feb 28, 2026, 9:23 PM"
 */
export function formatSyncTime(iso: string | undefined | null): string {
  if (!iso || typeof iso !== "string") return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Parse stored TVL string (e.g. "$1.2M", "$50.5k") back to number for aggregation */
export function parseTvlToNumber(tvlStr: string | undefined): number {
  if (!tvlStr || typeof tvlStr !== "string") return 0;
  const cleaned = tvlStr.replace(/\$/g, "").replace(/,/g, "").trim();
  const match = cleaned.match(/^([\d.]+)\s*([kKmM])?$/);
  if (!match) return 0;
  let val = parseFloat(match[1]);
  if (!Number.isFinite(val)) return 0;
  const suffix = (match[2] || "").toUpperCase();
  if (suffix === "M") val *= 1e6;
  else if (suffix === "K") val *= 1e3;
  return val;
}
