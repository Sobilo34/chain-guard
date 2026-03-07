/** Serverless/production platforms where CRE CLI cannot run (no subprocess, no global npm). */
export function isServerlessProduction(): boolean {
  if (process.env.CHAINGUARD_CRE_DISABLED === "1") return true;
  if (process.env.NODE_ENV !== "production") return false;
  return !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY ||
    process.env.RENDER
  );
}

export const CRE_NOT_AVAILABLE_MESSAGE =
  "CRE (Chainlink Risk Engine) is not available in this deployment. Full Analysis and cron scans require the `cre` CLI, which cannot run on serverless hosts (Pxxl, Vercel, Netlify). Run the app locally with `cre` installed (npm install -g @chainlink/cre), or use a self-hosted backend.";
