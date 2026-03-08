# ChainGuard Sentinel

**AI-powered smart contract risk monitoring—decentralized by Chainlink CRE.**

ChainGuard Sentinel is a monitoring and alerting system for **already-deployed** smart contracts. It detects market-based risks (depegs, volatility spikes, liquidity drops) using AI and Chainlink’s Runtime Environment (CRE), without requiring any change to your contract code.

---

## The problem we address

Smart contract owners face ongoing risk after deployment: market moves, liquidity events, and oracle deviations can lead to liquidations, depegs, or exploits. Existing tools often:

- Rely on **centralized** dashboards or bots (single point of failure).
- Don’t **orchestrate** monitoring, AI analysis, and alerts in one decentralized flow.
- Require custom infra for **multi-chain** and high-frequency data.

ChainGuard Sentinel uses **Chainlink CRE** to run the full pipeline (EVM reads → market data → AI analysis → on-chain report) as a **single decentralized workflow**, so execution is tamper-resistant, verifiable, and scalable.

---

## How we address it

1. **One-click risk analysis**  
   You add a contract address; the app sends a request to a **CRE consumer contract** on Sepolia. A CRE workflow (EVM log trigger) picks up the event, reads contract state and market data, runs AI risk analysis, and writes the report back on-chain. The dashboard shows risk level, score, and summary without you running any backend.

2. **Automatic scanning at interval**  
   The dashboard (or Vercel Cron in production) calls a trigger API at a configurable interval (e.g. every 30 seconds for testing, 15 minutes in production). That API sends `requestRiskAnalysis` for every monitored contract. CRE (local listener or DON) runs the workflow and writes reports; the UI polls and updates “Last updated” so you can confirm the cron is working.

3. **Persistence and clarity**  
   Contracts and analysis results are cached in the frontend; “Last updated” and relative timestamps are shown across the dashboard and contract pages so you can track when each contract was last analyzed.

4. **No backend required**  
   The flow is: **Frontend → Consumer contract (tx) → CRE workflow → Consumer contract (report)**. The Next.js app only talks to the chain and to its own API routes; the CRE workflow runs locally (`cre workflow simulate`) or on a Chainlink DON.

---

## How we use CRE

- **EVM log trigger**  
  The CRE workflow is triggered by the `RiskAnalysisRequested` event emitted by the **ChainGuardCREConsumer** contract when a user (or the interval job) calls `requestRiskAnalysis(contractAddress, chainSelectorName)`.

- **Blockchain + external systems**  
  The workflow (in the [chain-guard-cre](https://github.com/your-org/chain-guard-cre) repo):
  - Reads **on-chain** contract state (balances, tokens) via EVM.
  - Fetches **market data** (e.g. Chainlink Data Feeds / price feeds) and can use **OpenRouter/Gemini** for AI risk analysis.
  - Writes the **risk report** back on-chain via the consumer contract so the frontend can read it with `getAssessment(requestId)`.

- **Simulation and production**  
  - **Local:** Run `npm run script:cre-listener` in this repo; it watches for `RiskAnalysisRequested` and runs `cre workflow simulate` in chain-guard-cre so the report is written to Sepolia.  
  - **Production:** Deploy the same workflow to a Chainlink DON; the DON listens for the event and writes the report. No change to the frontend—only where the workflow runs.

This satisfies the hackathon requirement: **build/simulate/deploy a CRE workflow that integrates at least one blockchain with an external API, system, data source, or LLM**, demonstrated via CRE CLI simulation or live DON deployment.

---

## Stack and architecture

| Layer            | Technology |
|-----------------|------------|
| Frontend         | Next.js 16, React, Tailwind, Vercel |
| Wallet / chain   | Wagmi, viem, Sepolia |
| CRE integration  | Consumer contract (Sepolia), EVM log trigger, on-chain report storage |
| Workflow runtime | [chain-guard-cre](https://github.com/your-org/chain-guard-cre) (CRE CLI simulate or DON) |
| Contracts        | [chain-guard-smart-contract](https://github.com/your-org/chain-guard-smart-contract) (ChainGuardRegistry, ChainGuardCREConsumer) |

**Flow (high level):**

```
User / Cron → Frontend → requestRiskAnalysis(tx) → Consumer contract
                                                          ↓
                                              RiskAnalysisRequested event
                                                          ↓
                                              CRE workflow (EVM trigger)
                                                          ↓
                                              EVM reads + feeds + AI → report
                                                          ↓
                                              Write report on consumer contract
                                                          ↓
Frontend ← getAssessment(requestId) ← Consumer contract
```

---

## Link to all files that use Chainlink

As per the hackathon submission guidelines, here are the files in **this repository** that use or integrate with Chainlink (CRE consumer contract, CRE triggers, or Chainlink-related config):

### CRE consumer and on-chain integration

| File | Purpose |
|------|--------|
| [lib/cre-consumer.ts](lib/cre-consumer.ts) | CRE consumer address, chain id, `parseOnchainAssessment` for reading reports |
| [lib/cre-consumer-abi.ts](lib/cre-consumer-abi.ts) | ABI for `requestRiskAnalysis` and `getAssessment` |
| [hooks/use-cre-onchain.ts](hooks/use-cre-onchain.ts) | `useRequestCREAnalysis`, `useCREAssessment` (wagmi/viem read contract) |
| [app/api/cre/trigger-analysis/route.ts](app/api/cre/trigger-analysis/route.ts) | Server-side: sends `requestRiskAnalysis` for all contracts (cron/interval) |
| [app/api/cre/assessment/route.ts](app/api/cre/assessment/route.ts) | Server-side: reads `getAssessment(requestId)` for polling |
| [app/dashboard/analysis-context.tsx](app/dashboard/analysis-context.tsx) | Persists analysis state and polls CRE assessment |
| [app/dashboard/contracts/[id]/page.tsx](app/dashboard/contracts/[id]/page.tsx) | Run Full Analysis UI, calls consumer, applies on-chain result |
| [app/dashboard/page.tsx](app/dashboard/page.tsx) | Trigger-analysis at interval, persists requestIds, polls assessments |
| [app/dashboard/contracts/page.tsx](app/dashboard/contracts/page.tsx) | Contract list and CRE-related UI |
| [scripts/cre-evm-listener.mjs](scripts/cre-evm-listener.mjs) | Watches `RiskAnalysisRequested`, runs `cre workflow simulate` |
| [scripts/run-full-analysis-flow.mjs](scripts/run-full-analysis-flow.mjs) | Script to run full flow (tx → poll `getAssessment`) |

### CRE-related API and lib (analysis, discovery, feeds)

| File | Purpose |
|------|--------|
| [app/api/cre/analyze/route.ts](app/api/cre/analyze/route.ts) | Optional server-side analyze (pre-CRE + CRE simulate + post-CRE AI) |
| [app/api/cre/analyze/stream/route.ts](app/api/cre/analyze/stream/route.ts) | Streaming analyze with CRE |
| [app/api/cre/simulate/route.ts](app/api/cre/simulate/route.ts) | CRE simulate API |
| [app/api/cre/enrich/route.ts](app/api/cre/enrich/route.ts) | Enrich CRE output with AI |
| [app/api/cre/portfolio/route.ts](app/api/cre/portfolio/route.ts) | Portfolio/TVL using chain data |
| [app/api/cron/scan/route.ts](app/api/cron/scan/route.ts) | Cron entrypoint; coordinates with trigger-analysis |
| [lib/cre/run-discovery.ts](lib/cre/run-discovery.ts) | Contract discovery (EVM reads, optional AI naming) |
| [lib/cre/feeds.ts](lib/cre/feeds.ts) | Chainlink price feed addresses |
| [lib/cre/chainlink-prices.ts](lib/cre/chainlink-prices.ts) | Chainlink price feed usage |
| [lib/cre/build-config.ts](lib/cre/build-config.ts) | Build CRE config from discovery |
| [lib/cre/run-simulate.ts](lib/cre/run-simulate.ts) | Run CRE simulation |
| [lib/cre/serverless-check.ts](lib/cre/serverless-check.ts) | CRE availability check in serverless |
| [lib/cre/post-cre-ai.ts](lib/cre/post-cre-ai.ts) | Post-CRE AI step |
| [lib/api.ts](lib/api.ts) | `applyOnchainAssessmentToContractStorage`, CRE-related types |
| [lib/storage.ts](lib/storage.ts) | Persists contracts and alerts; merge with CRE results |
| [lib/email-templates/risk-alert.ts](lib/email-templates/risk-alert.ts) | Email alerts for risk events |

### Config and UI

| File | Purpose |
|------|--------|
| [app/dashboard/scan-context.tsx](app/dashboard/scan-context.tsx) | Scan context (legacy; trigger-analysis used for interval) |
| [app/dashboard/alerts/page.tsx](app/dashboard/alerts/page.tsx) | Alerts feed (alerts may be driven by CRE results) |
| [app/page.tsx](app/page.tsx) | Landing; mentions CRE/Chainlink |
| [components/web3-provider.tsx](components/web3-provider.tsx) | Web3 config for wallet and chain (Sepolia for consumer) |
| [vercel.json](vercel.json) | Cron for `/api/cre/trigger-analysis` and `/api/cron/scan` |

The **CRE workflow** itself (EVM trigger, EVM reads, Chainlink feeds, AI, write report) lives in the [chain-guard-cre](https://github.com/your-org/chain-guard-cre) repository.

---

## Quick start

### Prerequisites

- Node.js 18+
- A funded Sepolia wallet (for sending `requestRiskAnalysis` and for CRE automation)
- [Chainlink CRE CLI](https://github.com/smartcontractkit/cre-cli) installed (for local listener)

### 1. Install and configure

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set at least:

- `NEXT_PUBLIC_CHAINGUARD_CRE_CONSUMER_ADDRESS` – consumer contract (from chain-guard-smart-contract deploy)
- `NEXT_PUBLIC_CRE_CONSUMER_CHAIN_ID=11155111`
- `NEXT_PUBLIC_SEPOLIA_RPC_URL` or `ALCHEMY_API_KEY` – for Sepolia RPC
- `CRE_AUTOMATION_PRIVATE_KEY` or `CRE_REQUEST_PRIVATE_KEY` – for interval-triggered analysis (optional; omit to use only manual “Run Full Analysis”)

### 2. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect your wallet (Sepolia), and add a contract.

### 3. Run the CRE listener (local simulation)

So that “Run Full Analysis” actually runs the workflow and writes the report on-chain:

```bash
npm run script:cre-listener
```

Keep this running in a separate terminal. It watches for `RiskAnalysisRequested` on the consumer contract and runs `cre workflow simulate` in the **chain-guard-cre** repo (clone it next to chain-guard or set `CRE_PROJECT_PATH`). Configure chain-guard-cre with Alchemy RPC and OpenRouter/Gemini (see chain-guard-cre README).

### 4. Optional: automatic scanning every 30 seconds

In `.env.local`:

```env
NEXT_PUBLIC_CHAIN_GUARD_SCAN_INTERVAL_MS=30000
```

With the dashboard open, the app will call the trigger-analysis API every 30s and the listener will process each request. “Last updated” on each contract card updates when the report is written and the frontend poller applies it.

---

## Scan interval and production

- The **first** scan runs a few seconds after the dashboard loads; subsequent runs use the interval (default 15 minutes).
- **Production:** Deploy the CRE workflow to a Chainlink DON and set `CRE_AUTOMATION_PRIVATE_KEY` (or `CRE_REQUEST_PRIVATE_KEY`) in Vercel. Use Vercel Cron (see `vercel.json`) to hit `/api/cre/trigger-analysis` on a schedule (e.g. every 15 minutes). No backend in the Next.js app—only the consumer contract and the DON.

---

## Related repositories

- **[chain-guard-cre](https://github.com/your-org/chain-guard-cre)** – CRE workflow (EVM log trigger, EVM reads, Chainlink feeds, AI, on-chain report).
- **[chain-guard-smart-contract](https://github.com/your-org/chain-guard-smart-contract)** – ChainGuardRegistry and ChainGuardCREConsumer (Sepolia).

Replace `your-org` with your GitHub username or organization in the links above.

---

## License

MIT.
