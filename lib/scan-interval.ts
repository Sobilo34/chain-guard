/**
 * Scan interval configuration for CRE/cron.
 * - CHAINGUARD_SCAN_INTERVAL_MS: dashboard auto-scan + dev cron poller interval (ms)
 * - CHAINGUARD_CRON_SCHEDULE: CRE config cron expression + vercel.json reference
 */

const DEFAULT_SCAN_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_CRON_SCHEDULE = "*/15 * * * *"; // every 15 minutes

/** Interval in ms for dashboard auto-scan and dev cron poller. Set to 30000 for 30s testing. */
export function getScanIntervalMs(): number {
  const raw = process.env.CHAINGUARD_SCAN_INTERVAL_MS ?? process.env.NEXT_PUBLIC_CHAIN_GUARD_SCAN_INTERVAL_MS;
  if (!raw) return DEFAULT_SCAN_INTERVAL_MS;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SCAN_INTERVAL_MS;
}

/** Cron expression for CRE config. Used when writing config.json. */
export function getCronSchedule(): string {
  return process.env.CHAINGUARD_CRON_SCHEDULE || DEFAULT_CRON_SCHEDULE;
}
