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
4. Call the program's `initialize` instruction is _not_ re-runnable; a dedicated `rotate_attestor` instruction is tracked as a Phase D follow-up. Until it lands, rotation means redeploying the program with a new Config account — do this via the multisig.

## Upgrade checklist (every mainnet push)

- [ ] `anchor test` passes green on CI
- [ ] bankrun 80%+ coverage on every instruction (`tests/*.spec.ts`)
- [ ] Audit report for the new code reviewed
- [ ] Circuit-breaker tested in staging (pause → deposit reverts → resume)
- [ ] Rollback buffer captured (`solana program dump <program-id> rollback.so`)
- [ ] On-call sign-off in #yieldfy-ops

## Emergency pause

Call `initialize`'s authority account + flip `config.paused = true` via a dedicated `set_paused` instruction (Phase D). Until that lands, an emergency pause requires a program upgrade that hardcodes `require!(false, …)` at the top of `deposit_wxrp_to_kamino::handle`.
