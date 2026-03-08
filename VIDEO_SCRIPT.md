# ChainGuard Sentinel – Video Explainer Script (3–5 minutes)

Use this as a guide to record your **publicly viewable** hackathon video. Keep the total length **under 5 minutes**. Practice once with a timer so you hit the key points without rushing.

---

## Before you record

- **Environment:** Browser on the dashboard (Sepolia), terminal visible for listener (optional but impressive).
- **Prepare:** One contract already added (e.g. USDT), CRE listener running in a separate terminal so “Run Full Analysis” completes during the demo.
- **Audio:** Quiet room; speak clearly and at a steady pace.
- **Resolution:** 1080p is enough; ensure UI and terminal text are readable.

---

## Section 1: Hook and problem (30–45 seconds)

**What to show:** Either a static slide/screen with one sentence, or your face to camera.

**What to say (adapt in your words):**

> “Smart contract owners face a real problem: after deployment, market risk doesn’t stop. Price moves, liquidity drops, and oracle deviations can trigger liquidations or exploits. Most tools run on centralized servers—single point of failure, and you can’t verify how the decision was made. We built ChainGuard Sentinel so the entire pipeline—reading the contract, pulling market data, running AI risk analysis, and storing the result—runs as a **Chainlink CRE workflow**. One transaction from the app triggers the workflow; the result is written back on-chain. No backend, no trust in a single server.”

**Tip:** Emphasize “one transaction” and “result written on-chain” so judges immediately see the CRE integration.

---

## Section 2: High-level architecture (30–45 seconds)

**What to show:** Split screen or a simple diagram (can be a hand-drawn sketch on paper or a single slide): Frontend → Consumer contract → CRE workflow → back to contract.

**What to say:**

> “Here’s the flow. The frontend is a Next.js app—users add contract addresses and click ‘Run Full Analysis.’ That sends a transaction to our **CRE consumer contract** on Sepolia. The contract emits a **RiskAnalysisRequested** event. The **Chainlink CRE workflow**—which we run locally with the CRE CLI or deploy on a DON—listens for that event. It reads the target contract’s state on-chain, fetches market data using **Chainlink Data Feeds**, runs an **AI risk analysis** via OpenRouter or Gemini, and then writes the report back to the same consumer contract. The frontend polls **getAssessment** and shows risk level, score, and summary. So: blockchain plus external data and LLM, orchestrated by CRE, with the outcome on-chain.”

**Tip:** Say “RiskAnalysisRequested,” “getAssessment,” and “Chainlink Data Feeds” so judges hear the Chainlink/CRE terms.

---

## Section 3: Live demo – dashboard and Run Full Analysis (1–1.5 minutes)

**What to show:** Screen share of the ChainGuard app.

1. **Dashboard**
   - Open the ChainGuard dashboard (Overview or Contracts).
   - Briefly: “Users see monitored contracts and last updated time. We support automatic scanning at an interval—for example every 30 seconds for testing—so you can confirm the cron is working via ‘Last updated.’”
   - Point at one contract card and its “Updated …” time.

2. **Contract detail**
   - Click into one contract (e.g. Tether/USDT).
   - “On the contract page you see current risk and, if available, the last analysis. To run a new analysis, we click **Run Full Analysis**.”

3. **Run Full Analysis**
   - Click **Run Full Analysis**.
   - “This sends a transaction to the CRE consumer contract. I have the CRE listener running in another terminal—that’s the CRE CLI simulating the workflow when it sees the event.”
   - Optional: Switch to terminal for 5–10 seconds and show the listener log (e.g. “Processing request …”, “Report submitted …”).
   - Switch back to the app: “Once the workflow finishes, it writes the report on-chain. The app polls and updates the UI with the new risk level and summary.”

4. **Result**
   - Show the updated risk badge, score, and executive summary (or CRE observations).
   - “So in one click we’ve triggered a decentralized workflow that read the chain, used external data and AI, and stored the result on-chain—exactly what CRE is for.”

**Tip:** If something fails (e.g. RPC slow), keep going; mention “normally the report appears in under a minute” and show the flow you prepared.

---

## Section 4: CRE workflow (simulation) (45–60 seconds)

**What to show:** Either (A) the **chain-guard-cre** repo in your editor with `evm-triggered-workflow.ts` open, or (B) terminal: run `cre workflow simulate` once and show the log (trigger → fetch state → market data → AI → write report).

**What to say:**

> “The workflow lives in our **chain-guard-cre** repo. It’s an EVM log-triggered CRE workflow. When it sees **RiskAnalysisRequested**, it fetches the contract’s state—balances, tokens—from the chain, pulls market data from **Chainlink price feeds**, runs an AI risk analysis, and then encodes and writes the report to the consumer contract. We’ve simulated it successfully with the CRE CLI; for production we deploy the same workflow to a Chainlink DON so there’s no single point of failure. The frontend doesn’t change—only where the workflow runs.”

**Tip:** Name the file (`evm-triggered-workflow.ts`) and at least one integration (“Chainlink price feeds,” “AI risk analysis”) so judges see blockchain + external system + CRE.

---

## Section 5: Repos and wrap-up (30–45 seconds)

**What to show:** GitHub repo list or a single slide with three repo names and one-line descriptions.

**What to say:**

> “All code is public. **chain-guard** is the frontend and API—it lists every file that uses Chainlink in the README. **chain-guard-smart-contract** has the CRE consumer and registry on Sepolia. **chain-guard-cre** has the CRE workflow: EVM trigger, Chainlink feeds, and AI. We’ve made sure the READMEs describe the problem we’re solving, how we use CRE, and where Chainlink is used so judges can follow the flow. Thanks for watching.”

**Tip:** End with a clear “thank you” and, if you have it, the link to the submission or the main repo.

---

## Timing checklist (target ~4 minutes)

| Section              | Content                      | Target time |
|----------------------|-----------------------------|-------------|
| 1. Hook and problem   | Problem + CRE in one sentence | 30–45 s     |
| 2. Architecture       | Flow diagram + request/report | 30–45 s     |
| 3. Live demo          | Dashboard → Run Full Analysis → result | 1–1.5 min   |
| 4. CRE workflow       | Repo/CLI + simulate          | 45–60 s     |
| 5. Repos and wrap-up  | READMEs + thanks             | 30–45 s     |

---

## Do’s and don’ts

- **Do:** Show the transaction (wallet approval) and the UI updating after the report.
- **Do:** Say “Chainlink CRE,” “EVM log trigger,” “RiskAnalysisRequested,” “getAssessment,” and “Chainlink Data Feeds” (or “price feeds”) at least once.
- **Do:** Mention “simulation with the CRE CLI” and optionally “deploy to a DON” for production.
- **Don’t:** Go over 5 minutes; cut a section (e.g. shorten architecture or wrap-up) if needed.
- **Don’t:** Expose private keys, API keys, or `.env` contents; use a clean demo account and blurred or example env.

---

## If you have extra time (optional)

- Show the **Alerts** or **Active Sentinel** section and say alerts can be driven by risk levels from the CRE report.
- Show **Settings** or **Add contract** to emphasize that setup is “add address, run analysis.”
- One line: “We also support automatic scanning on a schedule so every contract gets re-analyzed without manual clicks.”

Use this script as a backbone; adjust wording to your style so the video sounds natural and confident.
