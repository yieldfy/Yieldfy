# @yieldfy/wxrp-indexer

Polls the wXRP SPL mint on Solana and emits mint/burn deltas as structured logs and Prometheus counters. Backs the Hex Trust reconciliation view in Grafana (§11 of the engineering plan).

## Env

| var | required | default | purpose |
| --- | --- | --- | --- |
| `SOLANA_RPC_URL` | yes | — | RPC used to read the mint account |
| `WXRP_MINT` | yes | — | base58 mint address of wXRP |
| `PORT` | no | `4100` | HTTP port |
| `INDEXER_POLL_MS` | no | `15000` | poll cadence (min 1000) |

## Endpoints

| path | purpose |
| --- | --- |
| `GET /health` | liveness |
| `GET /supply` | last known supply snapshot |
| `GET /metrics` | Prometheus scrape target |

## Metrics

- `yieldfy_wxrp_supply` (gauge) — current total supply in base units.
- `yieldfy_wxrp_mint_total` / `yieldfy_wxrp_burn_total` (counters) — cumulative deltas since process start.
- `yieldfy_wxrp_poll_errors_total` (counter) — supply-poll failures.

## Run

```
SOLANA_RPC_URL=https://api.devnet.solana.com \
WXRP_MINT=<base58-mint> \
npm -w @yieldfy/wxrp-indexer run dev
```
