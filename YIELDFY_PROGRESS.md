# Yieldfy — Yieldfy Progress Tracker

Mirrors §12 (Timeline & DoD) of `Yieldfy_Engineering_Plan_v0.2.pdf`, scoped to **yieldfy** deliverables.
Status legend: `⬜ pending` · `🟨 in progress` · `✅ completed` · `⏳ waiting for yieldfy`

---

## Phase map

| Phase | Maps to | Scope | Status |
|-------|---------|-------|--------|
| 1 | W1 | Wallet adapter + Phantom/Backpack connect + `.env.example` | ✅ completed |
| 2 | W2 | `useWxrpBalance` + `useVenueData` hooks, delete `mockData.ts`, empty states | ⬜ pending |
| 0 | — | Monorepo migration (`apps/`, `packages/`, `services/`) | ⬜ pending |
| 3 | W6 | Optimizer service: `score.ts`, `feeds.ts`, Fastify `server.ts` | ⬜ pending |
| 4 | W7 | `attest.ts` signer + risk-profile weights + `/attest` endpoint | ⬜ pending |
| 5 | W3+W5 | `packages/sdk` + `client.deposit()` against stub IDL | ⏳ waiting for yieldfy |
| 6 | W4 | Positions view reads on-chain PDAs | ⏳ waiting for yieldfy |
| 7 | W8 | Webhook emitters + Prometheus `/metrics` | ⬜ pending |
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

## Notes

- Yieldfy owns the Anchor program (`programs/yieldfy/`) + venue CPIs + bankrun tests. Phases 5 & 6 cannot finish until his W3–W4 lands (Kamino CPI deposit + yXRP mint + Position PDA).
- Marketing site (`yieldfy.ai`) is a separate Vercel project — not tracked here until explicitly needed.
