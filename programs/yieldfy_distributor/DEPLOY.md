# yieldfy_distributor — deploy procedure

The merkle-distributor program for Phase 2 SOL rewards. Built artifact lives at `target/deploy/yieldfy_distributor.so` after `anchor build -p yieldfy_distributor`. The program keypair at `target/deploy/yieldfy_distributor-keypair.json` is gitignored and must remain so — its pubkey is the program ID.

## Pre-flight checklist

- [ ] `anchor build -p yieldfy_distributor` produces `.so` cleanly
- [ ] `solana-keygen pubkey target/deploy/yieldfy_distributor-keypair.json` matches `declare_id!` in `src/lib.rs` and `Anchor.toml`
- [ ] Deployer wallet has ≥3 SOL (program rent ~2.5 SOL at current rates)
- [ ] Squads vault address is `48uosZFYVqLr5XEKsuohtrwfnsYkcqP9PVX838rGZXKD` (from `reference_mainnet_addresses.md`)

## Step 1 — Initial deploy from deployer wallet

```bash
solana program deploy \
  --program-id target/deploy/yieldfy_distributor-keypair.json \
  --keypair ~/.config/solana/id.json \
  --url $MAINNET_RPC \
  target/deploy/yieldfy_distributor.so
```

This deploys the program and sets the upgrade authority to the deployer wallet (transient). Cost: ~2-3 SOL.

## Step 2 — Transfer upgrade authority to Squads

```bash
solana program set-upgrade-authority \
  9jXLmjPtUSZ2P1D22mXYSmjmHPty2AExeU1cXoEwnEqa \
  --new-upgrade-authority 48uosZFYVqLr5XEKsuohtrwfnsYkcqP9PVX838rGZXKD \
  --keypair ~/.config/solana/id.json \
  --url $MAINNET_RPC
```

After this, future upgrades require a Squads 2-of-2 transaction. Deployer keypair no longer has authority.

## Step 3 — Initialize a Distributor instance (Squads tx)

The `initialize` instruction creates the on-chain `Distributor` account + treasury PDA. Build via Squads UI (or `solana-cli` + `anchor` for the tx body) and have both signers approve.

```ts
// pseudocode for the tx the Squads transaction should wrap
await distributor.methods
  .initialize({ distributorId: new BN(0) })
  .accounts({
    distributor: <Distributor PDA from SDK>,
    treasury:    <Treasury PDA from SDK>,
    admin:       <Squads vault pubkey>,
    systemProgram: SystemProgram.programId,
  })
  .instruction();
```

`distributor_id = 0` is the canonical first instance. SDK exposes `findDistributorPda(0n)` and `findTreasuryPda(distributor)` for the addresses.

## Step 4 — Top up the treasury

```ts
await distributor.methods
  .topUp(new BN(2 * LAMPORTS_PER_SOL))
  .accounts({ distributor, treasury, payer: <funder>, systemProgram })
  .instruction();
```

Anyone can top up — the treasury is a SOL-only PDA, no spend authority needed for incoming transfers. For initial launch with 5 users, 2 SOL is plenty (~3 weeks of runway at $200k MC).

## Step 5 — Publish the first epoch root (Squads tx)

After the rewards-indexer runs its first epoch:

```bash
cd services/rewards-indexer
SOLANA_RPC_URL=$MAINNET_RPC \
YIELDFY_MINT=<launch mint> \
npm run epoch:run
```

Output JSON includes `merkleRoot` and `participants`. Sum the lamports for `epoch_lamports_total`. Build the Squads tx:

```ts
await distributor.methods
  .publishEpoch(
    new BN(epochId),
    Array.from(Buffer.from(merkleRoot.replace(/^0x/, ""), "hex")),
    new BN(epochLamportsTotal),
  )
  .accounts({ distributor, admin: <Squads vault> })
  .instruction();
```

Both signers approve, root lands on-chain, claim flow opens.

## Step 6 — Configure dashboard env

Set in Vercel:

```
VITE_DISTRIBUTOR_PROGRAM_ID=9jXLmjPtUSZ2P1D22mXYSmjmHPty2AExeU1cXoEwnEqa
VITE_REWARDS_INDEXER_URL=https://rewards.yieldfy.ai
VITE_DISTRIBUTOR_ID=0
```

Manual redeploy per the standing rule. The Overview "Launch Rewards" card switches from preview to live claim button automatically once these resolve.

## Operational notes

- **Pausing:** `set_paused(true)` via Squads halts publish + claim (withdraw-equivalent here is just leaving the treasury intact). Use if anything goes sideways.
- **Epoch monotonicity:** `publish_epoch` enforces `epoch_id > current_epoch_id`. Don't republish or roll back.
- **Treasury underflow:** the program checks treasury lamports against payout, but in practice you should top up *before* publishing a root. If treasury < total claimed at end of epoch, late claimers will hit `TreasuryUnderflow`.
- **Cumulative cap:** `epoch_lamports_total` is the published bound. Sum of all `claim` payouts ≤ this. The off-chain leaf set's lamport sum should equal this — the indexer can compute it for you.
- **Closing an epoch:** there's no explicit close. Publishing a new root simply replaces `current_root`; old `ClaimStatus` PDAs persist (they'd block double-claims even across root rotations). If you want to reclaim rent from old `ClaimStatus` PDAs, that's a follow-up `close_claim_status` ix.

## What this program does NOT do

- **No SPL token claim path.** SOL only. If you ever want to distribute $YIELDFY itself, fork or extend.
- **No bitmap optimization.** Each claim writes a `ClaimStatus` PDA (~144 bytes rent ≈ 0.001 SOL paid by claimant). At your 5–50 user scale this is fine; at 10k+ it becomes wasteful and you'd want a Saber-style bitmap.
- **No streaming distribution.** Roots are atomic per-epoch.
