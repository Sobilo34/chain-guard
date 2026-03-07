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

## Scan interval (testing)

The CRE cron runs every 15 minutes by default. For faster testing:

- **Local (30s)**: Add to `.env.local`:
  ```
  NEXT_PUBLIC_CHAIN_GUARD_SCAN_INTERVAL_MS=30000
  ```
  With the dashboard open, `/api/cron/scan` is polled every 30s (full flow: alerts + on-chain writes).

- **Vercel**: Edit `vercel.json` and change `schedule` to `"*/1 * * * *"` (every minute; Vercel minimum).

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

So: **Frontend → Consumer contract (tx) → CRE workflow (chain-guard-cre) → Consumer contract (report)**. The bridge-api in chain-guard-cre is optional (e.g. for local CRE simulation or discovery); the app does not depend on it for production.

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository