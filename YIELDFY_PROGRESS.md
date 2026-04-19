# Yieldfy — Yieldfy Progress Tracker

Mirrors §12 (Timeline & DoD) of `Yieldfy_Engineering_Plan_v0.2.pdf`, scoped to **yieldfy** deliverables.
Status legend: `⬜ pending` · `🟨 in progress` · `✅ completed` · `⏳ waiting for yieldfy`

---

## Phase map

| Phase | Maps to | Scope | Status |
|-------|---------|-------|--------|
| 1 | W1 | Wallet adapter + Phantom/Backpack connect + `.env.example` | ✅ completed |
| 2 | W2 | `useWxrpBalance` + `useVenueData` hooks, delete `mockData.ts`, empty states | ✅ completed |
| 0 | — | Monorepo migration (`apps/`, `packages/`, `services/`) | ⬜ pending |
| 3 | W6 | Optimizer service: `score.ts`, `feeds.ts`, Fastify `server.ts` | ✅ completed |
| 4 | W7 | `attest.ts` signer + risk-profile weights + `/attest` endpoint | ✅ completed |
| 5 | W3+W5 | `packages/sdk` + `client.deposit()` against stub IDL | ⏳ waiting for yieldfy |
| 6 | W4 | Positions view reads on-chain PDAs | ⏳ waiting for yieldfy |
| 7 | W8 | Webhook emitters + Prometheus `/metrics` | ✅ completed |
| 8 | W9 | Observability end-to-end (Grafana JSON, Axiom, correlation IDs) | ⬜ pending |
| 9 | W10 | Docs + `@yieldfy/sdk@1.0.0` publish pipeline | ⬜ pending |

---

## Definition of Done (yieldfy-scoped)

- **Per feature:** structured log line with correlation ID + webhook emitted.
- **Per SDK change:** one integration test in `tests/` + IDL types regenerated.
- **Per release:** semver bump + changelog + npm publish + dashboard deploy gated on CI green.

---

## Phase log

### ✅ Phase 1 — Wallet adapter (W1)

**Delivered:**
- `src/providers/SolanaWalletProvider.tsx` — Connection + WalletProvider + WalletModalProvider wrapping the app; endpoint reads `VITE_SOLANA_RPC_URL`, falls back to devnet.
- `src/main.tsx` — Buffer global polyfill, wraps root with `SolanaWalletProvider` + `QueryClientProvider`.
- `src/App.tsx` — removed duplicate `QueryClientProvider` (now owned by `main.tsx` per §03 note).
- `src/components/dashboard/DashboardLayout.tsx` — `WalletMultiButton` in top bar; sidebar footer shows truncated connected address + live/gray status dot.
- `src/index.css` — `yieldfy-wallet-btn` styles to blend the adapter button with the glass aesthetic.
- `.env.example` — `VITE_SOLANA_RPC_URL`, `VITE_WXRP_MINT`, `VITE_YIELDFY_PROGRAM_ID`, `VITE_OPTIMIZER_URL`.

**Deviation from §03:** used only `PhantomWalletAdapter` explicitly — `BackpackWalletAdapter` is no longer exported from `@solana/wallet-adapter-wallets`; Backpack/Solflare etc. are auto-detected via Wallet Standard.

**Landing CTAs wired (Phase 1 extension):** replaced all "Coming soon" buttons in `HeroSection.tsx` (4) + `YieldfyLanding.tsx` (6) with `Link to="/dashboard"` ("Launch App") and `https://github.com/yieldfy` ("View on GitHub") where paired.

---

### ✅ Phase 2 — Live balance + DeFiLlama venues (W2)

**Delivered:**
- `src/hooks/useWxrpBalance.ts` — connected wallet's wXRP ATA balance via `@solana/spl-token`; gracefully handles missing `VITE_WXRP_MINT` and non-existent ATAs.
- `src/hooks/useVenueData.ts` — fetches DeFiLlama `yields.llama.fi/pools`, maps to Kamino/MarginFi/Drift/Meteora snapshots with 60 s refetch.
- `src/components/dashboard/EmptyState.tsx` — reusable dashed-border empty card.
- `OverviewView.tsx` — metrics card shows live wXRP balance; yield chart, active positions, recent activity replaced with empty states (⏳ yieldfy).
- `PositionsView.tsx` — empty state until Position PDAs exist (⏳ yieldfy).
- `VenuesView.tsx` — live APY / TVL / utilization for 4 venues, sorted by APY by default; renders "No live wXRP markets yet" banner if DeFiLlama has no data for the mapped pool IDs. Decision log → empty state until optimizer attests (Phase 4).
- `HistoryView.tsx` — empty state + export CSV disabled until activity exists.
- **Deleted** `src/components/dashboard/mockData.ts` (the file that actually held the mocks; §04 refers to `src/lib/mockData.ts` which never existed in this repo).

**Notes:**
- DeFiLlama pool IDs (`kamino-lend-wxrp`, etc.) are placeholders. Swap once each venue publishes its wXRP market ID.
- Balance decimals hardcoded to 6 — confirm at mainnet launch per §04 PDF note.

**Buffer polyfill fix:** `@solana/spl-token` references `Buffer` at module top-level; the original `main.tsx` polyfill ran after all imports resolved. Fix: new `src/polyfills.ts` imported first in `main.tsx` so `globalThis.Buffer` is set before any transitive Solana import evaluates.

---

### ✅ Phase 3 — Optimizer service scaffold (W6)

**Delivered:**
- `services/optimizer/package.json` — `@yieldfy/optimizer@0.1.0` standalone Node 20 service (Fastify + tweetnacl + @solana/web3.js, tsx for dev, vitest for tests).
- `services/optimizer/tsconfig.json` + `vitest.config.ts` — scoped to node env, keeps the root dashboard's vitest setup isolated.
- `services/optimizer/src/score.ts` — `scoreVenue` + `chooseVenue` pure functions, `WEIGHTS` for all three risk profiles (conservative / balanced / opportunistic), `VENUE_CODE` mapping.
- `services/optimizer/src/feeds.ts` — DeFiLlama fetcher returning `VenueSnapshot[]` with per-venue static `oracleAgeSec` + `auditScore` meta.
- `services/optimizer/src/server.ts` — Fastify app exposing `/health`, `/venues`, `/choose?profile=…`. `/attest` returns a stub "Not implemented" until Phase 4.
- `services/optimizer/src/score.test.ts` — 3 vitest unit tests covering profile weighting + winner selection (all passing).
- `services/optimizer/README.md` — endpoints, env vars, scoring weights table.

**Verified:** `npm run dev` starts on `http://localhost:4000`. `/health` returns `{ok:true}`, `/choose?profile=balanced` returns a scored winner using live DeFiLlama data.

---

### ✅ Phase 4 — Attestation signer (W7)

**Delivered:**
- `services/optimizer/src/attest.ts` — `loadSigner()` reads `YIELDFY_ATTESTOR_KEY` (JSON byte array) or generates an ephemeral keypair with a loud warning log. `signAttestation(venue, slot)` builds the 9-byte `[venue_u8, slot_u64_le]` message the Anchor ed25519 precompile check expects (§07) and returns `{ venue, venueCode, slot, sigHex, pubkeyBase58 }`.
- `services/optimizer/src/server.ts` — `/attestor/pubkey`, full `/attest?profile=…` that reads the current Solana slot via `Connection.getSlot()`, scores, signs, returns the attestation + snapshot.
- `services/optimizer/src/attest.test.ts` — 6 vitest cases covering signature shape, verification round-trip, tamper detection, determinism.
- README updated with attestor key generation + endpoint table.

**Verified:** `npm test` — 9/9 passing (3 score + 6 attest). `curl /attest?profile=balanced` against a running server returns a live signed attestation with a real devnet slot.

**Integration note for yieldfy:** the `attestor` pubkey to bake into `Config.attestor` is whatever `/attestor/pubkey` returns for the server instance we end up deploying. Locally it regenerates every restart unless `YIELDFY_ATTESTOR_KEY` is set.

---

### ✅ Phase 7 — Webhooks + Prometheus metrics (W8)

**Delivered:**
- `services/optimizer/src/metrics.ts` — Prometheus registry with default Node process metrics, plus `yieldfy_attestations_total{venue, profile}`, `yieldfy_attestation_duration_seconds{profile}`, `yieldfy_feeds_fetch_duration_seconds`, `yieldfy_webhook_dispatch_total{status, event}`.
- `services/optimizer/src/webhooks.ts` — in-memory subscription store, HMAC-SHA256 body signing (`X-Yieldfy-Signature: sha256=…` header), `dispatchEvent()` fire-and-forget dispatcher with 5s per-target timeout.
- `services/optimizer/src/webhooks.test.ts` — 6 vitest cases covering create/list/delete, URL validation, signature round-trip + tamper detection, dispatch filtering, HTTP call shape.
- `services/optimizer/src/server.ts` — new endpoints `/metrics`, `/webhooks` (GET + POST), `/webhooks/:id` (DELETE). `/attest` now increments counters, records latency, and dispatches `attestation.created` webhook async.

**Verified:** `npm test` — 15/15 passing (3 score + 6 attest + 6 webhooks). Live `curl http://localhost:4000/metrics` shows `yieldfy_attestations_total{venue="kamino",profile="balanced"} 1` + full histogram buckets after one `/attest` call. POST-created webhook to `httpbin.org` delivered successfully (`yieldfy_webhook_dispatch_total{status="2xx"} 1`).

**Tenant integration snippet:**
```
curl -X POST http://optimizer/webhooks \
  -H "Content-Type: application/json" \
  -d '{"url":"https://tenant.example/hook","events":["attestation.created"]}'
# → { id, secret, ... }  — verify inbound X-Yieldfy-Signature with HMAC-SHA256(body, secret)
```

---

## Notes

- Yieldfy owns the Anchor program (`programs/yieldfy/`) + venue CPIs + bankrun tests. Phases 5 & 6 cannot finish until his W3–W4 lands (Kamino CPI deposit + yXRP mint + Position PDA).
- Marketing site (`yieldfy.ai`) is a separate Vercel project — not tracked here until explicitly needed.
