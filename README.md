# Yieldfy

Auto-router for wXRP (Hex Trust custodied, LayerZero-bridged) into Solana yield venues. Users deposit wXRP, receive `yXRP` 1:1, and the router picks the best venue and rebalances on a signed attestation from the optimizer service.

See `Yieldfy_Engineering_Plan_v0.2.pdf` for the full design and `YIELDFY_PROGRESS.md` for the current build status.

## Repo layout

```
yieldfypriv/
├── src/                       # Dashboard — Vite + React (will move to apps/dashboard at Phase 0)
├── packages/
│   └── sdk/                   # @yieldfy/sdk — typed client (scaffold until IDL lands)
├── services/
│   └── optimizer/             # Node 20 Fastify service — scoring, attestations, webhooks, metrics
├── ops/                       # Grafana dashboards, Prometheus config
├── docs/                      # Integration / webhooks / observability guides
└── .github/workflows/         # CI + release pipelines
```

## Getting started

### Dashboard

```bash
npm install
npm run dev        # http://localhost:8080
npm test
npm run build
```

Copy `.env.example` → `.env.local` and fill in:
- `VITE_SOLANA_RPC_URL` — defaults to devnet.
- `VITE_WXRP_MINT` — wXRP mint address on your target cluster.
- `VITE_OPTIMIZER_URL` — e.g. `http://localhost:4000`.
- `VITE_YIELDFY_PROGRAM_ID` — from `anchor deploy` (waiting for yieldfy).

### Optimizer

```bash
cd services/optimizer
npm install
npm run dev        # http://localhost:4000
npm test
```

Docs: [`services/optimizer/README.md`](./services/optimizer/README.md).

### SDK

```bash
cd packages/sdk
npm install
npm run build
```

Docs: [`packages/sdk/README.md`](./packages/sdk/README.md). Scaffold only until Phase 5 (waiting for yieldfy's IDL).

## Documentation

- [`docs/integration.md`](./docs/integration.md) — how tenants consume the SDK + optimizer.
- [`docs/webhooks.md`](./docs/webhooks.md) — webhook payloads, signature verification.
- [`docs/observability.md`](./docs/observability.md) — correlation IDs, Prometheus, Grafana, Axiom.
- [`YIELDFY_PROGRESS.md`](./YIELDFY_PROGRESS.md) — phase-by-phase build log (yieldfy side).

## Publishing

- `@yieldfy/sdk`: tag `sdk-vX.Y.Z` matching `packages/sdk/package.json`. `release-sdk.yml` publishes to npm with provenance.
- Dashboard: deployed via Vercel (connect the GitHub repo — Vercel picks up `vite build` automatically).
