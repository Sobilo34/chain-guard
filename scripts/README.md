# Full Analysis flow script

Replays the **same flow as the frontend** Full Analysis: request on-chain CRE → wait for result → print assessment.

## What it does (step by step)

1. **Setup** — Load env (consumer, RPC, key, contract to analyze).
2. **Submit tx** — `requestRiskAnalysis(contractAddress, chainSelectorName)` on Sepolia.
3. **Get requestId** — From `RiskAnalysisRequested` in the receipt.
4. **Poll** — Calls `getAssessment(requestId)` every 4s (same as frontend) until `filled === true`.
5. **Result** — Prints risk level, score, and summary.

So you see exactly: tx → event → CRE workflow runs (off-screen) → report written on-chain → poll sees result.

**Note:** For the poll to eventually return a result, the CRE workflow must run when the event is emitted. For MVP/video testing use the CRE listener (see below).

---

## MVP / video: Full Analysis works with one click

To demo Full Analysis without pasting tx hashes or running CRE interactively:

1. **Terminal 1** — Start the frontend: `cd chain-guard && npm run dev`
2. **Terminal 2** — Start the CRE listener: `cd chain-guard && npm run script:cre-listener`

The listener watches for `RiskAnalysisRequested` and runs `cre workflow simulate ... --evm-tx-hash <tx> --broadcast` automatically. When you click **Full Analysis** in the app, the report is written and the UI updates (usually 1–2 min). **Requirements:** `cre` in PATH, `chain-guard-cre` next to `chain-guard` (or set `CRE_PROJECT_PATH`).

## Run (one-off script)

From the **chain-guard** directory:

```bash
# Use contract/chain from env (see below)
npm run script:full-analysis
```

Or with inline env:

```bash
CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7 CHAIN_SELECTOR=ethereum-mainnet npm run script:full-analysis
```

## Env (set in `.env.local` or export)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CHAINGUARD_CRE_CONSUMER_ADDRESS` | Yes | CRE consumer contract (Sepolia). |
| `NEXT_PUBLIC_CRE_CONSUMER_CHAIN_ID` | No | Default `11155111` (Sepolia). |
| `SEPOLIA_RPC_URL` or `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Yes | Sepolia RPC. |
| `CRE_REQUEST_PRIVATE_KEY` or `CHAINGUARD_REGISTRY_PRIVATE_KEY` | Yes | Private key (with or without `0x`) to send the request tx. |
| `CONTRACT_ADDRESS` | Yes | Contract to analyze (e.g. USDT on mainnet). |
| `CHAIN_SELECTOR` | No | Default `ethereum-mainnet`. |

Your wallet must have a little Sepolia ETH to pay gas for `requestRiskAnalysis`.
