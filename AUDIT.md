# Audit scope — programs/yieldfy

This document summarises the on-chain attack surface, trust model, and invariants for an external auditor reviewing `programs/yieldfy/` prior to mainnet-beta.

## In scope

| Path | Purpose |
| --- | --- |
| `programs/yieldfy/src/lib.rs` | Program entrypoints: `initialize`, `deposit_wxrp_to_kamino`, `withdraw`, `rebalance`, `set_paused`, `rotate_attestor`, `set_cap`. |
| `programs/yieldfy/src/state.rs` | `Config`, `Position` account layouts, error enum. |
| `programs/yieldfy/src/admin.rs` | Authority-gated admin instructions. |
| `programs/yieldfy/src/attest.rs` | ed25519 precompile introspection + staleness check. |
| `programs/yieldfy/src/deposit_ix.rs` | Deposit flow — attestation verification, wXRP pull, Kamino CPI, yXRP mint, Position update. |
| `programs/yieldfy/src/withdraw_ix.rs` | Withdraw flow — yXRP burn, Kamino redeem, wXRP return, Position debit. |
| `programs/yieldfy/src/rebalance.rs` | Authority-gated venue migration. |
| `programs/yieldfy/src/venues/` | Venue CPI adapters (Kamino today; MarginFi/Drift/Meteora deferred). |
| `tests/*.spec.ts` | Bankrun integration tests — every instruction has a negative-path suite. |

## Out of scope

- Off-chain optimizer (`services/optimizer/`) — reviewed separately under the ed25519 trust assumption that `Config.attestor` is the only signer whose attestations the program accepts.
- Dashboard (`apps/dashboard/`) — purely client-side; program does not trust any dashboard-derived input.
- wXRP mint authority — assumed to be an out-of-protocol bridge (LayerZero + Hex Trust); the program only enforces that deposits use `Config.wxrp_mint`.
- Squads multisig — the authority pubkey is treated as opaque; rotation of the multisig itself is handled by `solana program set-upgrade-authority`, not by this program.

## Trust model

| Principal | Trust level | Enforcement |
| --- | --- | --- |
| `Config.authority` | Full control over `set_paused`, `rotate_attestor`, `set_cap`, `rebalance`. On mainnet this is a Squads 2-of-3 vault. | `has_one = authority` on `AdminOnly`. |
| `Config.attestor` | Signs every `deposit` via ed25519 precompile. Can direct a deposit to any venue the authority has whitelisted. | `attest::verify` pins the public key byte-for-byte against `Config.attestor`. |
| User wallet | Trusted only to sign withdrawals of their own `Position`. | `position.owner == user.key()` constraint on `Withdraw`. |
| Kamino program | Trusted to behave as a vanilla reserve on the CPI surface in `venues::kamino`. | Address-pinned to `KAMINO_PROGRAM_ID`; Phase C will add post-CPI state checks. |

## Security invariants

The program is intended to preserve these at all times. Each should be covered by at least one test; auditors should probe the negative paths.

1. **Attestation freshness.** Every successful `deposit` must be gated by an ed25519 instruction at `ix_sysvar` index 0 signed by `Config.attestor`. Staleness bound: `Clock::slot <= attestation_slot + Config.staleness_slots`. (`attest::verify`)
2. **Venue binding.** The venue byte inside the signed attestation message must equal `expected_venue` passed by the caller. Prevents replay of an attestation across venues. (`attest::verify`, `YieldfyError::VenueMismatch`)
3. **Deposit cap.** `args.amount <= Config.max_single_deposit`. (`deposit_ix::handle_deposit`)
4. **Pause semantics.** `Config.paused == true` blocks `deposit` and `rebalance` (both hard-revert with `YieldfyError::Paused`). `withdraw` is **never** blocked — users can always exit. (`deposit_ix::handle_deposit`, `rebalance::handle_rebalance`; `withdraw_ix::handle_withdraw` deliberately omits the check)
5. **1:1 receipt.** For every base unit of wXRP moved into the vault, exactly one base unit of yXRP is minted. Symmetric on withdraw: burning N yXRP returns N wXRP. Position bookkeeping (`principal`, `receipt_supply`) is mutated only in lockstep with the token flows.
6. **Mint authority.** `Config` PDA is the sole mint authority for `yxrp_mint`; the deploy runbook hands authority over in step [3/4] of `init-devnet.ts` / mainnet equivalent. The program signs all mints/burns with the `config` seed.
7. **Position uniqueness.** One `Position` PDA per user per program, seeded `["position", user]`. `init_if_needed` must never reset a non-zero position — protected by the `principal/receipt_supply` using `saturating_add` on existing fields.
8. **Authority monotonicity.** `authority` is set once during `initialize` and never mutated by the program. An authority rotation requires a `program-upgrade` migration instruction (not yet present — flagged for Phase D+).

## Known threat vectors worth probing

- **ed25519 precompile bypass.** The `attest::verify` routine reads offsets at fixed positions in the precompile's instruction data. An auditor should verify those byte offsets against the Solana runtime source at the pinned version (`ED25519_PROGRAM_ID = Ed25519SigVerify111111111111111111111111111`), and probe: multi-sig precompile instructions, negative message lengths, truncated data.
- **Staleness window drift.** `Config.staleness_slots` is authority-tunable via `set_cap`. An auditor should reason about the smallest safe value (tight window = optimizer DoS risk) and largest safe value (wide window = replay risk).
- **Rebalance trust.** The `rebalance` instruction is authority-only today; auditors should consider whether the per-venue invariants hold if the authority signs a malformed or adversarial `RebalanceArgs`.
- **CPI return ignorance.** Phase B leaves wXRP in our own vault and the Kamino CPI is a stub. Phase C will add post-CPI reserve-mint balance checks; the audit should re-run once Phase C lands and explicitly gate on that audit before mainnet.
- **Precision and overflow.** `principal` and `receipt_supply` use `saturating_add`/`sub`. With 6-decimal wXRP, 2^64 base units ≈ 1.8e13 wXRP — overflow is not a practical concern but should be confirmed with a proptest.
- **`ix_sysvar` spoofing.** `attest::verify` pins `ix_sysvar.key == IX_SYSVAR_ID` (`Sysvar1nstructions1111111111111111111111111`). Confirm no path can supply a spoofed account.
- **Upgrade authority.** The program upgrade authority on mainnet must be the Squads vault **before** the first real user deposit. The deploy runbook enforces this ordering; auditors should include verification that the `solana program show` output matches on mainnet post-handoff.

## Recommended coverage additions (pre-mainnet)

- Property test: for any sequence of `deposit` + `withdraw` calls for a user, `Position.principal == Position.receipt_supply == user's yXRP balance`.
- Property test: `sum(Position.principal) == vault_wxrp.amount + Kamino_obligation.deposited_amount` (Phase C).
- Fuzz: random 9-byte attestation messages — `attest::verify` must reject everything except the exact `(venue, slot)` pair.
- Replay: attempt the same `(attestation, args)` tuple in a later slot past the staleness window — must revert with `AttestationStale`.

## Engagement notes

- **Build and test.** `avm install 0.32.1 && avm use 0.32.1 && anchor build && npm run anchor:test`. CI: `.github/workflows/anchor.yml`.
- **Program binary.** Devnet deploy lives at `3PY2nY7UVQR327WeSdJFrsrcrqhD4wE2CHg4ZcDarGDE`; see [`ops/DEPLOYMENTS.md`](./ops/DEPLOYMENTS.md) for the canonical record.
- **Reporting channel.** Private vulnerability reports via GitHub Security Advisories on [`yieldfy/Yieldfy`](https://github.com/yieldfy/Yieldfy/security/advisories/new), or PGP email per [`SECURITY.md`](./SECURITY.md).
