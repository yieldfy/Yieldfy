# Phase C — Kamino CPI integration status

**Status (2026-04-22): blocked on venue listing.**

## Summary

The deposit path in `deposit_ix.rs` is Phase B — wXRP parks in the Yieldfy program vault; the Kamino CPI stub at `venues/kamino.rs::supply` is a no-op. Users get a correctly-minted yXRP receipt but the underlying wXRP sits idle earning nothing until Phase C ships real CPI.

## What Phase C requires

1. **A Kamino reserve whose `liquidity_mint == 6UpQcMAb5xMzxc7ZfPaVMgx3KqsvKZdT5U718BzD5We2` (wXRP).** Without it, there's no target to deposit into.
2. Our program to open an Obligation PDA owned by `Config`, one-time, via Kamino's `init_obligation` instruction.
3. The deposit path to issue three CPIs per user deposit:
   - `refresh_reserve` — update interest accrual
   - `refresh_obligation` — reconcile obligation state
   - `deposit_reserve_liquidity_and_obligation_collateral` — atomic supply + collateralize
4. The withdraw path symmetric:
   - `refresh_reserve` + `refresh_obligation`
   - `withdraw_obligation_collateral_and_redeem_reserve_collateral` — atomic burn cToken + return wXRP + accrued yield

klend instruction signatures confirmed at [`Kamino-Finance/klend` `programs/klend/src/lib.rs`](https://github.com/Kamino-Finance/klend/blob/master/programs/klend/src/lib.rs).

## Blocking issue

Scanning `api.kamino.finance/strategies` (2026-04-22) returns zero strategies referencing wXRP mint `6UpQcMAb5xMzxc7ZfPaVMgx3KqsvKZdT5U718BzD5We2` as either `tokenAMint` or `tokenBMint`. There is no live Kamino reserve accepting wXRP.

Writing speculative CPI code before the reserve exists has no way to be tested. Once Kamino lists wXRP, the integration becomes mechanical — the stubs in `venues/kamino.rs` already name the correct account order.

## Immediate alternatives (if yield generation is needed before Kamino listing)

1. **Raydium/Orca LP strategy** — if a wXRP/USDC pool exists, Yieldfy could deploy into LP and earn AMM fees. Requires different venue code; not a Kamino drop-in.
2. **Propose wXRP listing to Kamino** — engage the Kamino team to add a wXRP reserve. Typically requires a risk-parameters proposal + governance vote.
3. **Launch yield-less** — Beta-0 posture (today): program lets users wrap wXRP↔yXRP at 1:1 as a signed-venue wrapper. Announce honestly as "custody + attestation layer, yield routing pending venue integration." This is the current state.

## Re-enabling Phase C

When Kamino lists wXRP, the remaining work is:
- Fill the instruction discriminators + Borsh argument structs in `venues/kamino.rs`
- Wire the CPI calls via `invoke_signed` with the Config PDA signer seeds
- Add `init_obligation` admin instruction to create the Obligation PDA one-time
- Update `deposit_ix.rs` and `withdraw_ix.rs` to build the refresh+action pre-instructions
- Bankrun integration tests against klend's mainnet-fork fixture

Expected size: ~400-600 lines of Rust + 200-300 lines of tests. ~3-5 days of focused work assuming the developer has klend's account layouts at hand.

## Recommendation

**Ship the wrapper-only Beta-0 as-is.** The product is credible as a signed-venue custody + attestation layer even without yield. When a venue lists wXRP (Kamino first, else MarginFi/Drift/Meteora per `state.rs` venue enum), Phase C becomes a 1-2 week workstream including audit scope, not a blocker for launch.
