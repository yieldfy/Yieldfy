# @yieldfy/rewards-indexer

SOL rewards indexer for Phase 2 of Yieldfy. Snapshots `$YIELDFY` token holders + wXRP vault Position PDAs every epoch, computes per-wallet SOL distributions via the dual-stake scoring math in `@yieldfy/sdk`, builds a merkle tree of `(wallet → lamports)` claims, and exposes the result over HTTP for the dashboard + on-chain claim contract.

## What it does

1. **Snapshot** — `getProgramAccounts(TOKEN_PROGRAM, mint=$YIELDFY)` for token holders, `getProgramAccounts(YIELDFY_PROGRAM, dataSize=Position)` for vault positions.
2. **Price** — Jupiter price API for $YIELDFY, SOL, and wXRP. MC = price × supply.
3. **Score** — `distributeEpoch()` from the SDK applies `score = yieldfy^α × vaultUsd^β` with eligibility floors.
4. **Merkle** — keccak-hashed leaves of `(index, wallet, lamports)`, sorted-pair tree → root + per-wallet proofs.
5. **Persist** — JSON file per epoch in `STORAGE_DIR`, plus `latest.json`.

## Endpoints

```
GET  /health                    liveness
GET  /metrics                   prometheus
GET  /epoch/latest              most recent published epoch
GET  /epoch/:id                 specific epoch
GET  /claim/:wallet             wallet's claim from latest epoch (404 if none)
GET  /claim/:wallet/:epochId    wallet's claim from a specific epoch
POST /admin/run-epoch           publish a new epoch (rejects if last < EPOCH_HOURS old)
```

## Configuration

Required-ish env (validation runs at boot):

| var | default | what |
|---|---|---|
| `SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | Helius / QuickNode / Triton recommended |
| `YIELDFY_MINT` | (unset) | $YIELDFY mint. Endpoints return empty until set |
| `YIELDFY_SUPPLY` | `1_000_000_000` | total supply for MC = price × supply |
| `WXRP_MINT` | mainnet wXRP | for vault USD valuation |
| `YIELDFY_PROGRAM_ID` | mainnet program | for Position PDA discovery |
| `STORAGE_DIR` | `./data/epochs` | JSON files written here |
| `EPOCH_HOURS` | `168` | weekly default; admin endpoint rate-limits to this |
| `ALPHA` / `BETA` / `DISTRIBUTION_RATE` | (SDK defaults) | per-deployment overrides |
| `PORT` | `4100` | |

## Running

```bash
# install
npm install

# unit tests (no chain access)
npm test

# manual epoch run (cron-friendly)
SOLANA_RPC_URL=$RPC YIELDFY_MINT=$MINT npm run epoch:run

# HTTP server
npm run dev
```

## Pre-launch behaviour

If `YIELDFY_MINT` is unset or the token isn't tradable yet, the indexer still runs end-to-end against vault positions. MC will be 0 → pool will be 0 → no claims published. Useful for sanity-checking the pipeline without touching the token.

## Where this connects to the rest of the stack

- **Scoring math** lives in `@yieldfy/sdk`'s `rewards.ts` — single source of truth, used by the dashboard for projections too.
- **Dashboard** reads `/claim/:wallet` to surface pending rewards in the UI.
- **On-chain claim program** (TBD — separate Anchor program, Squads-deployed) verifies the merkle proof against the published root and transfers SOL from a treasury PDA. The leaf format in `merkle.ts` is the contract: if you change it here, change the program too.
