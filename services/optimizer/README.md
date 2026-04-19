# @yieldfy/optimizer

Off-chain scoring + attestation service. Called by the SDK before every deposit and rebalance to produce a signed (venue, slot) tuple the Anchor program verifies via its ed25519 precompile check.

## Scripts

```bash
npm install
npm run dev    # tsx watch — hot reloads on change
npm run build  # emits dist/
npm start      # node dist/server.js
npm test       # vitest run
```

## Endpoints

| Path       | Method | Description                                    |
| ---------- | ------ | ---------------------------------------------- |
| `/health`  | GET    | Liveness check.                                |
| `/venues`  | GET    | Current DeFiLlama snapshots for all venues.    |
| `/choose`  | GET    | `?profile=conservative\|balanced\|opportunistic` — returns the top-scoring venue. |
| `/attest`  | GET    | Placeholder. Signed attestation lands in Phase 4. |

## Environment

| Var    | Default                     |
| ------ | --------------------------- |
| `PORT` | `4000`                      |
| `HOST` | `0.0.0.0`                   |

## Scoring weights (§09)

| Profile          | apy  | tvl  | util | oracle | audit |
| ---------------- | ---- | ---- | ---- | ------ | ----- |
| conservative     | 0.35 | 0.25 | 0.15 | 0.10   | 0.15  |
| balanced         | 0.50 | 0.20 | 0.10 | 0.10   | 0.10  |
| opportunistic    | 0.70 | 0.10 | 0.05 | 0.05   | 0.10  |
