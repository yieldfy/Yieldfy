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

## Docker

```bash
docker build -t yieldfy/optimizer services/optimizer
docker run --rm -p 4000:4000 \
  -e YIELDFY_ATTESTOR_KEY="$(cat attestor.json)" \
  -e SOLANA_RPC_URL=https://api.devnet.solana.com \
  yieldfy/optimizer
```

Image runs as a non-root user, ships only production deps, and exposes a `HEALTHCHECK` that hits `/health`.

## Endpoints

| Path                | Method | Description                                    |
| ------------------- | ------ | ---------------------------------------------- |
| `/health`           | GET    | Liveness — cheap, always 200 if the process answers. |
| `/health/ready`     | GET    | Readiness — probes DeFiLlama, Solana RPC, and attestor key in parallel (3 s timeout each). Returns 200 when all green, 503 otherwise. |
| `/attestor/pubkey`  | GET    | Ed25519 public key used to sign attestations. Whitelist this in the Anchor `Config.attestor` field. |
| `/venues`           | GET    | Current DeFiLlama snapshots for all venues.    |
| `/choose`           | GET    | `?profile=conservative\|balanced\|opportunistic` — returns the top-scoring venue (unsigned). |
| `/attest`           | GET    | `?profile=…` — selects the top venue, fetches the current Solana slot, and returns a signed attestation the SDK passes to `deposit_wxrp_to_kamino` via an ed25519 pre-instruction. Fires `attestation.created` webhook. |
| `/metrics`          | GET    | Prometheus exposition format (`text/plain; version=0.0.4`). Scrape interval ≥ 15 s recommended. |
| `/webhooks`         | GET    | List subscriptions.                           |
| `/webhooks`         | POST   | `{ url, events: ["attestation.created"], secret? }` — registers a tenant webhook. Returns the subscription with its secret (generated if omitted). |
| `/webhooks/:id`     | DELETE | Unregisters a subscription.                   |

### Webhook delivery

- Each POST carries `X-Yieldfy-Event`, `X-Yieldfy-Delivery` (uuid), `X-Yieldfy-Correlation-Id`, and `X-Yieldfy-Signature: sha256=<hex>` headers.
- Signature is `HMAC-SHA256(body, subscription.secret)`; verify with `verifySignature(body, secret, header)` from `webhooks.ts` (constant-time compare).
- Retries: up to 3 attempts per delivery with 1 s → 5 s → 30 s backoff. 4xx responses are treated as permanent failures (no retry); 5xx and transport errors are retried. Final give-ups are counted as `yieldfy_webhook_dispatch_total{status="dead"}`.
- Subscription store: in-memory by default; set `REDIS_URL` for persistence across restarts.

### Metrics exposed

- `yieldfy_attestations_total{venue, profile}` — counter of signed attestations by winner + profile.
- `yieldfy_attestation_duration_seconds{profile}` — histogram of end-to-end `/attest` latency.
- `yieldfy_feeds_fetch_duration_seconds` — histogram of DeFiLlama fetch latency.
- `yieldfy_webhook_dispatch_total{status, event}` — counter of webhook POST attempts by HTTP status class.
- Default Node process metrics (CPU, memory, event loop lag).

## Environment

| Var                    | Default                              | Purpose                                                    |
| ---------------------- | ------------------------------------ | ---------------------------------------------------------- |
| `PORT`                 | `4000`                               | HTTP listen port.                                          |
| `HOST`                 | `0.0.0.0`                            | HTTP listen host.                                          |
| `SOLANA_RPC_URL`       | `https://api.devnet.solana.com`      | RPC used to read the current slot for attestation freshness. |
| `YIELDFY_ATTESTOR_KEY` | *(ephemeral)*                        | JSON array of 64 bytes (solana-keygen output). When unset, the server generates a fresh keypair on boot and logs its pubkey — convenient for dev, fatal for prod. |
| `REDIS_URL`            | *(in-memory)*                        | `redis://…` to persist webhook subscriptions across restarts. Without it, subscriptions live in-process. |
| `ATTEST_RATE_MAX`      | `60`                                 | Max `/attest` requests per `ATTEST_RATE_WINDOW` per client IP. |
| `ATTEST_RATE_WINDOW`   | `1 minute`                           | `@fastify/rate-limit` window spec (e.g. `30 seconds`, `5 minutes`). |

### Generating a persistent attestor key

```bash
solana-keygen new --no-bip39-passphrase -o attestor.json
export YIELDFY_ATTESTOR_KEY="$(cat attestor.json)"
```

Then whitelist the printed `/attestor/pubkey` in the Anchor `Config.attestor` field.

## Scoring weights (§09)

| Profile          | apy  | tvl  | util | oracle | audit |
| ---------------- | ---- | ---- | ---- | ------ | ----- |
| conservative     | 0.35 | 0.25 | 0.15 | 0.10   | 0.15  |
| balanced         | 0.50 | 0.20 | 0.10 | 0.10   | 0.10  |
| opportunistic    | 0.70 | 0.10 | 0.05 | 0.05   | 0.10  |
