# Yieldfy

Auto-router for wXRP (Hex Trust custodied, LayerZero-bridged) into Solana yield venues. Users deposit wXRP, receive `yXRP` 1:1, and the router picks the best venue and rebalances on a signed attestation from the optimizer service.

See `Yieldfy_Engineering_Plan_v0.2.pdf` for the full design and `YIELDFY_PROGRESS.md` for the current build status.

## Repo layout

```
yieldfypriv/
├── apps/
│   └── dashboard/             # @yieldfy/dashboard — Vite + React
├── packages/
│   └── sdk/                   # @yieldfy/sdk — typed client
├── services/
│   └── optimizer/             # @yieldfy/optimizer — Fastify scoring + attestations
├── programs/                  # (yieldfy) Anchor program — yieldfy
├── ops/                       # Grafana dashboards, Prometheus config
├── docs/                      # Integration / webhooks / observability guides
├── .github/workflows/         # CI + release pipelines
├── package.json               # npm workspaces root
└── YIELDFY_PROGRESS.md
```

Managed with npm workspaces. One `npm install` at the root wires every workspace.

## Getting started

One install, three dev loops.

```bash
npm install          # installs all workspaces + hoists shared deps
npm run sdk:build    # build @yieldfy/sdk so the dashboard can consume it

npm run dev          # dashboard on http://localhost:8080
npm run optimizer:dev  # optimizer on http://localhost:4000
npm test             # runs every workspace's tests that exist
npm run build        # builds SDK + dashboard
```

### Dashboard env

Copy `apps/dashboard/.env.example` → `apps/dashboard/.env.local` and fill in:
- `VITE_SOLANA_RPC_URL` — defaults to devnet.
- `VITE_WXRP_MINT` — wXRP mint address on your target cluster.
- `VITE_OPTIMIZER_URL` — e.g. `http://localhost:4000`.
- `VITE_YIELDFY_PROGRAM_ID` — from `anchor deploy` (waiting for yieldfy).

### Per-workspace docs

- [`apps/dashboard`](./apps/dashboard) — Vite + React SPA.
- [`services/optimizer/README.md`](./services/optimizer/README.md) — scoring, attestations, webhooks, Prometheus.
- [`packages/sdk/README.md`](./packages/sdk/README.md) — typed client, stub IDL until Phase 5.

## Documentation

- [`docs/integration.md`](./docs/integration.md) — how tenants consume the SDK + optimizer.
- [`docs/webhooks.md`](./docs/webhooks.md) — webhook payloads, signature verification.
- [`docs/observability.md`](./docs/observability.md) — correlation IDs, Prometheus, Grafana, Axiom.
- [`YIELDFY_PROGRESS.md`](./YIELDFY_PROGRESS.md) — phase-by-phase build log (yieldfy side).

## Publishing

- `@yieldfy/sdk`: tag `sdk-vX.Y.Z` matching `packages/sdk/package.json`. `release-sdk.yml` publishes to npm with provenance.
- Dashboard: deployed via Vercel (connect the GitHub repo — Vercel picks up `vite build` automatically).
