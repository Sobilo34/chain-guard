# ChainGuard Sentinel UI

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/bilal-oyeleke-solius-projects/v0-chain-guard-sentinel-ui)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/uJIsdzbyi5p)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/bilal-oyeleke-solius-projects/v0-chain-guard-sentinel-ui](https://vercel.com/bilal-oyeleke-solius-projects/v0-chain-guard-sentinel-ui)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/uJIsdzbyi5p](https://v0.app/chat/uJIsdzbyi5p)**

## Scan interval and automatic Full Analysis

The dashboard runs a background task at an interval (default 15 minutes). You can set it to 30 seconds for testing.

- **Interval (e.g. 30s testing)**  
  In `.env.local`:
  ```
  NEXT_PUBLIC_CHAIN_GUARD_SCAN_INTERVAL_MS=30000
  ```
  With the dashboard open, the app calls **Full Analysis trigger** and cron/scan at this interval.

- **Automatic Full Analysis at interval**  
  To have Full Analysis run automatically for all monitored contracts (no manual "Run Full Analysis" click):
  1. **Local:** Set a **funded Sepolia wallet** private key in `.env.local`:
     ```
     CRE_AUTOMATION_PRIVATE_KEY=0x...   # or CRE_REQUEST_PRIVATE_KEY
     ```
     Keep the **CRE listener** running in a separate terminal (`npm run script:cre-listener`). Each interval the dashboard calls `POST /api/cre/trigger-analysis`; the API sends `requestRiskAnalysis` for each contract; the listener picks up the event and runs the workflow, then writes the report on-chain. The frontend will see new results when it polls or refreshes.
  2. **Production (CRE on DON):** Deploy the CRE workflow to a Chainlink DON. In your host (e.g. Vercel), set:
     - `CRE_AUTOMATION_PRIVATE_KEY` (or `CRE_REQUEST_PRIVATE_KEY`) — same funded Sepolia wallet.
     - Optional: Vercel Cron (see `vercel.json`) to `POST /api/cre/trigger-analysis` at the desired schedule (e.g. every 5–15 minutes). If you don’t set cron, only the “Run Full Analysis” button will trigger analysis; with cron, the DON will run Full Analysis for all contracts on schedule.

  So: **same flow locally and in production** — something (dashboard timer or cron) calls the trigger API → API sends tx(s) to the consumer → CRE (listener or DON) runs the workflow and writes the report.

## Smart Contracts

ChainGuard registry lives in **chain-guard-smart-contract**. To deploy and use the on-chain registry:

1. `cd chain-guard-smart-contract`
2. Copy `.env.example` → `.env`; set `CHAINGUARD_REGISTRY_PRIVATE_KEY` (Sepolia deployer) and `SEPOLIA_RPC_URL`
3. Run `./deploy.sh` (or `source .env && forge script script/Deploy.s.sol --rpc-url "$SEPOLIA_RPC_URL" --broadcast`)
4. Add the deployed address to `chain-guard/.env.local`: `CHAINGUARD_REGISTRY_ADDRESS=0x...`, plus `CHAINGUARD_REGISTRY_PRIVATE_KEY` and `SEPOLIA_RPC_URL`

## ChainGuard CRE + Smart Contract (how they work together)

- **chain-guard** (this app): Frontend + Next.js API. Users add contracts, run **Full Analysis**, and see alerts. Full Analysis sends a transaction to the **CRE consumer contract** on Sepolia; no backend CRE runs in this app.
- **chain-guard-smart-contract**: Deploys **ChainGuardRegistry** (contracts/alerts) and **ChainGuardCREConsumer**. When a user runs Full Analysis, the frontend calls `requestRiskAnalysis(contractAddress, chainSelectorName)` on the consumer; the contract emits an event.
- **chain-guard-cre** (chainguard-sentinel): The **CRE workflow** that reacts to that event. Run it via Chainlink DON or locally (`cre run`). It reads the event, fetches contract + market data, runs AI, and writes the report back to the consumer contract. The frontend then reads the result with `getAssessment(requestId)`.

So: **Frontend → Consumer contract (tx) → CRE workflow (chain-guard-cre) → Consumer contract (report)**. The app does not use bridge-api; the CRE workflow runs from chainguard-sentinel only (locally via the listener or on a DON).

## Production configuration (frontend only)

You only deploy the **frontend** (and use already-deployed **smart contracts** on Sepolia). Set these in your host’s environment (e.g. Vercel → Project → Settings → Environment Variables) so the app works the same as locally:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CHAINGUARD_CRE_CONSUMER_ADDRESS` | Yes | CRE consumer contract address (from chain-guard-smart-contract deploy). |
| `NEXT_PUBLIC_CRE_CONSUMER_CHAIN_ID` | Yes | `11155111` (Sepolia). |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Recommended | Alchemy Sepolia URL so the wallet uses a fast RPC: `https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY`. |
| `NEXT_PUBLIC_CHAIN_GUARD_SCAN_INTERVAL_MS` | Optional | Poll interval in ms (e.g. `30000` for 30s). Dashboard calls trigger-analysis + cron at this interval. |
| `CRE_AUTOMATION_PRIVATE_KEY` or `CRE_REQUEST_PRIVATE_KEY` | For auto Full Analysis | Funded Sepolia wallet used by `POST /api/cre/trigger-analysis` to send `requestRiskAnalysis` for all contracts. Omit to use only the manual "Run Full Analysis" button. |
| `CHAINGUARD_REGISTRY_ADDRESS` | If using on-chain registry | Registry contract address (Sepolia). |
| `SEPOLIA_RPC_URL` or `ALCHEMY_API_KEY` | If using on-chain registry / trigger API | Used by server-side code (cron, registry, trigger-analysis). Same Alchemy URL or key. |

**RPC in production:** The frontend uses `NEXT_PUBLIC_SEPOLIA_RPC_URL` for wallet txs and reads (Full Analysis, consumer contract). Set it in Vercel (or your host) to your Alchemy Sepolia URL; the key will be in the URL and is public (browser). For server-side Sepolia (registry, etc.), set `SEPOLIA_RPC_URL` or `ALCHEMY_API_KEY` as well.

**CRE workflow RPC:** The CRE workflow does **not** run on Vercel. It runs where you start it (e.g. your machine with `cre run`, or a VPS, or a Chainlink DON). RPC for the workflow is configured there:

- **Local / VPS:** In **chain-guard-cre**, edit `project.yaml` and replace `YOUR_ALCHEMY_API_KEY` (or `ALCHEMY_API_KEY`) with your real Alchemy key so the workflow uses Alchemy for Sepolia/mainnet. If you run the workflow on a server, put the same key in that server’s env or in `project.yaml` there.
- **Chainlink DON:** When you deploy the workflow with `cre workflow deploy`, the DON uses the RPC config from the `project.yaml` in the repo you deploy from. Use Alchemy URLs there (with your key) before deploying so the DON uses a fast RPC for “Writing report on-chain”.

So: **frontend production** = env vars in Vercel (including `NEXT_PUBLIC_SEPOLIA_RPC_URL`). **CRE production** = RPC in `project.yaml` (or DON config) wherever the workflow actually runs.

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

   <!-- cd chain-guard
   npm run script:cre-listener -->