<div align="center">

# Yieldfy

**Institutional wXRP yield routing on Solana.**

Deposit wXRP. Receive yXRP 1:1. The router selects the best venue, attests the choice with an ed25519 signature, and rebalances on-chain.

[![ci](https://github.com/yieldfy/Yieldfy/actions/workflows/ci.yml/badge.svg)](https://github.com/yieldfy/Yieldfy/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-000.svg)](./LICENSE)
[![solana](https://img.shields.io/badge/solana-mainnet--beta-14F195.svg)](https://explorer.solana.com/)
[![sdk](https://img.shields.io/npm/v/@yieldfy/sdk.svg)](https://www.npmjs.com/package/@yieldfy/sdk)

[Website](https://yieldfy.ai) · [SDK](./packages/sdk) · [Docs](./docs) · [Security](./SECURITY.md) · [Contributing](./CONTRIBUTING.md)

</div>

---

## What it is

Yieldfy is a non-custodial routing layer that turns wrapped XRP (LayerZero-bridged, Hex Trust custodied) into a yield-bearing Solana position. A user deposits wXRP into the program, the program mints yXRP 1:1, and the off-chain optimizer signs an attestation naming the venue the funds should route to. The program verifies the attestation via the Solana ed25519 precompile before any CPI executes.

Every rebalance, every deposit, and every withdrawal is on-chain, event-emitting, and trivially auditable.

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│   Dashboard      │────▶│  Optimizer       │────▶│  Anchor Program      │
│   (Vite · React) │     │  (Fastify · TS)  │     │  (Solana · Rust)     │
│                  │     │                  │     │                      │
│  - wallet        │     │  - score venues  │     │  - verify attest.    │
│  - deposit UI    │     │  - sign attest. │     │  - CPI into venue    │
│  - positions     │     │  - webhooks     │     │  - mint yXRP 1:1     │
└──────────────────┘     └──────────────────┘     └──────────────────────┘
         │                        │                         │
         │                        │                         │
         ▼                        ▼                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  @yieldfy/sdk — typed Anchor client · IDL-generated types            │
└──────────────────────────────────────────────────────────────────────┘
         ▲
         │
┌──────────────────┐
│  wXRP Indexer    │
│  (Hex Trust obs.)│
└──────────────────┘
```

## Repository layout

| Path | Package | Purpose |
| --- | --- | --- |
| `apps/dashboard/` | `@yieldfy/dashboard` | Vite + React dashboard — wallet connect, deposit wizard, positions, history |
| `packages/sdk/` | `@yieldfy/sdk` | Typed Anchor client, published to npm |
| `services/optimizer/` | `@yieldfy/optimizer` | Fastify scoring service, attestation signer, webhooks, Prometheus metrics |
| `services/wxrp-indexer/` | `@yieldfy/wxrp-indexer` | Polls the wXRP mint for supply deltas; exposes `/supply` and `/metrics` |
| `programs/yieldfy/` | — | Anchor program — `initialize`, `deposit_wxrp_to_kamino`, `withdraw`, `rebalance` |
| `tests/` | — | Bankrun integration tests for every on-chain instruction |
| `ops/` | — | Grafana dashboards, Prometheus config, deploy script, runbooks |
| `docs/` | — | Integration, webhook, and observability guides |

## Quick start

```sh
# Install + run against the live devnet program in one shot
npm install
cp apps/dashboard/.env.example apps/dashboard/.env
./ops/dev.sh
```

- Dashboard → <http://localhost:8080>
- Optimizer → <http://localhost:4000>

Full walkthrough (test wXRP seeding, attestation checks, redeploy) in [docs/local-dev.md](./docs/local-dev.md). Integration-partner view in [docs/integration.md](./docs/integration.md).

## Deploy

```sh
./ops/deploy.sh devnet        # or: mainnet-beta
```

The script builds the program, deploys, copies the IDL into `@yieldfy/sdk`, and prints the program ID. See [ops/DEPLOY.md](./ops/DEPLOY.md) for the mainnet runbook, Squads multisig handoff, and the upgrade checklist.

## Supported venues

| Venue | Status | Phase |
| --- | --- | --- |
| Kamino Lend | Live on devnet | B · MVP |
| MarginFi | Scheduled | C |
| Drift | Scheduled | C |
| Meteora | Scheduled | C |

## Live deployments

| Cluster | Program ID | Status |
| --- | --- | --- |
| devnet | [`3PY2nY7UVQR327WeSdJFrsrcrqhD4wE2CHg4ZcDarGDE`](https://explorer.solana.com/address/3PY2nY7UVQR327WeSdJFrsrcrqhD4wE2CHg4ZcDarGDE?cluster=devnet) | Live (2026-04-21) |
| mainnet-beta | — | Audit pending |

Full deployment log in [ops/DEPLOYMENTS.md](./ops/DEPLOYMENTS.md).

## Observability

- **Prometheus** — `/metrics` on both the optimizer and the wXRP indexer
- **Grafana** — drop-in dashboard at [ops/grafana/yieldfy-optimizer.json](./ops/grafana/yieldfy-optimizer.json) (7 panels)
- **Axiom** — structured event stream via `AXIOM_TOKEN` + `AXIOM_DATASET`
- **Correlation IDs** — propagated end-to-end via the `X-Yieldfy-Correlation-Id` header

Full details in [docs/observability.md](./docs/observability.md).

## SDK

```sh
npm install @yieldfy/sdk
```

```ts
import { Yieldfy, fetchAttestation } from "@yieldfy/sdk";

const client = new Yieldfy(provider, YIELDFY_PROGRAM_ID);
const attestation = await fetchAttestation(OPTIMIZER_URL, "balanced");
await client.deposit({ amount: 1_000_000n }, attestation);
```

## Security

- ed25519 pre-instruction verification enforced on every deposit / rebalance
- Per-transaction and per-day deposit caps configured in `Config`
- Attestation staleness bound (`staleness_slots`) prevents replay
- Circuit breaker via `config.paused`
- Upgrade authority held by a 2-of-3 Squads multisig on mainnet-beta
- Responsible disclosure policy: [SECURITY.md](./SECURITY.md)

## License

[MIT](./LICENSE) © 2026 Yieldfy Labs.
