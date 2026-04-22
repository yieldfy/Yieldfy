# Yieldfy deploy & upgrade runbook

Owner: Yieldfy core team.

## Prerequisites

- `anchor@0.30.1+`, `solana-cli@1.18+`, `squads-cli@4+`
- A funded keypair at `~/.config/solana/id.json`
- For mainnet-beta: two-of-three Squads multisig already created; upgrade authority will be transferred to it after first deploy.

## First deploy (devnet)

```
./ops/deploy.sh devnet
```

The script runs `anchor build`, `anchor deploy`, copies the generated IDL into `packages/sdk/src/idl/yieldfy.json`, and prints the program ID. Then:

1. Paste the program ID into `apps/dashboard/.env` as `VITE_YIELDFY_PROGRAM_ID`.
2. If the printed ID differs from `declare_id!()` in `programs/yieldfy/src/lib.rs`, update the declare_id, `anchor build`, and redeploy once more.
3. Call `initialize()` to create the Config PDA. Pass the attestor pubkey returned by `GET /attestor/pubkey` on the optimizer host.
4. Transfer the yXRP mint authority to the Config PDA:
   ```
   spl-token authorize <yxrp-mint> mint <config-pda>
   ```

## Staged rollout strategy (unaudited launch posture)

Yieldfy is launching as a public beta without a paid external audit — the risk surface is contained by:

- Low per-tx deposit cap (`max_single_deposit = 100_000_000` = 100 wXRP at 6 decimals).
- Authority-gated pause via `set_paused(true)` callable from the Squads vault at any time.
- Withdraw is never blocked by `paused`, so users always retain exit.
- Cap and staleness window are tunable live via `set_cap` — no redeploy required.
- [`AUDIT.md`](../AUDIT.md) enumerates the 8 invariants; [`tests/invariants.spec.ts`](../tests/invariants.spec.ts) covers them under bankrun; the [Bug bounty](../SECURITY.md#bug-bounty) covers external review.

**Ramp plan** (absolute SOL figures; adjust for wXRP price):

| Phase | Cap (wXRP) | Trigger to advance | Expected duration |
| --- | --- | --- | --- |
| Beta-0 (today) | 100 | Successful `circuit-breaker-dryrun.ts` + 10+ real user deposits without invariant breach | 2 weeks |
| Beta-1 | 1,000 | No open critical/high bug-bounty findings; TVL > $50k; observability dashboards stable | 2 weeks |
| Beta-2 | 10,000 | External audit engaged OR TVL > $250k with no invariants violated | until audit lands |
| GA | uncapped | Audit report published + remediation merged | — |

Cap bumps go through `set_cap(new_cap, staleness_slots)` from the Squads vault. Record each bump in [`DEPLOYMENTS.md`](./DEPLOYMENTS.md).

**Abort conditions** — call `set_paused(true)` immediately if any of the following:

- Any deposit succeeds with `amount > Config.max_single_deposit` (invariant I3 violated).
- Any `Position.principal > Position.receipt_supply` or vice versa (invariant I5 violated).
- Any deposit succeeds without an ed25519 pre-ix matching `Config.attestor` (invariants I1/I2).
- Observed attestor privkey leak or any unexplained deviation in `/attestor/pubkey`.

## Mainnet-beta deploy

```
./ops/deploy.sh mainnet-beta
solana program set-upgrade-authority <program-id> --new-upgrade-authority <squads-vault>
```

After the authority transfer, future upgrades must go through Squads:

```
squads-cli program-upgrade \
  --program-id <program-id> \
  --buffer <buffer-account> \
  --multisig <squads-vault>
```

The buffer is produced by `solana program write-buffer target/deploy/yieldfy.so`. Sign the Squads transaction with 2-of-3 signers.

## Attestor key rotation

Attestor key lives in the optimizer process as `YIELDFY_ATTESTOR_KEY` (JSON byte array, 64 bytes). To rotate:

1. Generate a new ed25519 keypair (`solana-keygen new --no-bip39-passphrase -o new-attestor.json`).
2. Deploy the new key to the optimizer via the secret store (HSM-wrapped per §11).
3. Restart the optimizer. Confirm `GET /attestor/pubkey` returns the new pubkey.
4. Call `rotate_attestor(new_attestor)` on the program. The authority signer is `Config.authority` (on mainnet-beta this is the Squads vault; the call must go through a 2-of-3 Squads transaction). Emits `AttestorRotated { previous, current }`.
5. Drain any in-flight optimizer work that was signed by the old key before step 4 — deposits signed by the previous key will fail with `BadAttestor` once the new one is in place.

## Upgrade checklist (every mainnet push)

- [ ] `anchor test` passes green on CI
- [ ] bankrun 80%+ coverage on every instruction (`tests/*.spec.ts`)
- [ ] Audit report for the new code reviewed — scope + invariants tracked in [`AUDIT.md`](../AUDIT.md)
- [ ] Circuit-breaker validated on devnet: `DRY_RUN=0 npx tsx ops/scripts/circuit-breaker-dryrun.ts`
- [ ] Rollback buffer captured per [§Rollback procedure](#rollback-procedure) below
- [ ] On-call sign-off in #yieldfy-ops

## Rollback procedure

Before every mainnet upgrade, capture the currently-deployed program bytes so we can revert without waiting on a rebuild.

### Before the upgrade

```bash
PROGRAM_ID="<program-id>"
STAMP=$(date -u +"%Y%m%dT%H%M%SZ")
mkdir -p ops/artifacts/mainnet/rollback

solana program dump \
  --url mainnet-beta \
  "$PROGRAM_ID" \
  "ops/artifacts/mainnet/rollback/yieldfy-${STAMP}.so"

shasum -a 256 "ops/artifacts/mainnet/rollback/yieldfy-${STAMP}.so" \
  > "ops/artifacts/mainnet/rollback/yieldfy-${STAMP}.sha256"
```

Commit the `.sha256` (but **not** the `.so`, which is large and git-ignored under `ops/artifacts/`). Record the hash + tx slot in [`ops/DEPLOYMENTS.md`](./DEPLOYMENTS.md) before you push the new version.

### To roll back

```bash
# 1. Publish the rollback buffer from the captured bytes.
solana program write-buffer \
  --url mainnet-beta \
  "ops/artifacts/mainnet/rollback/yieldfy-<stamp>.so"
# → prints <rollback-buffer-pubkey>

# 2. Queue the upgrade through Squads (2-of-3).
squads-cli program-upgrade \
  --program-id "$PROGRAM_ID" \
  --buffer <rollback-buffer-pubkey> \
  --multisig <squads-vault>
```

Once 2 signers approve, execute. The on-chain bytes revert to the pre-upgrade version and the Config PDA is unaffected (state survives program-upgrades).

If the offending upgrade also touched Config layout, the rollback alone is insufficient — escalate to `set_paused(true)` via Squads first, then coordinate a migration instruction in the next upgrade.

## Emergency pause

Call `set_paused(true)` from the `Config.authority` signer. On mainnet-beta that means a Squads 2-of-3 transaction.

- Pausing halts `deposit_wxrp_to_kamino` and `rebalance` — both revert with `YieldfyError::Paused`.
- `withdraw` is **never** blocked by the pause bit, so users can always exit.
- Emits `PausedToggled { previous, current }` for observability. Resume with `set_paused(false)`.
- The per-tx deposit cap and attestation staleness window can be tuned live via `set_cap(max_single_deposit, staleness_slots)` — both must be `> 0`; set `paused=true` if the intent is a full halt rather than throttling.
