# @yieldfy/sdk

> **Status:** scaffold. The full client lands once the Anchor IDL is published (Phase 5 of the Yieldfy engineering plan).

Typed client for the Yieldfy wXRP auto-router on Solana.

## What works today

- `fetchAttestation(optimizerUrl, profile?)` — calls the optimizer's `/attest` endpoint and returns the signed attestation payload.
- `Attestation` / `VenueKey` / `DepositParams` — shared types used by both the dashboard and the on-chain program.

## What lands at Phase 5

- `Yieldfy` class — typed wrapper around the Anchor program: `deposit()`, `withdraw()`, `readPosition()`.
- Generated IDL types from `programs/yieldfy/target/idl/yieldfy.json` (published by yieldfy).
- ed25519 pre-instruction builder for `deposit_wxrp_to_kamino`.

## Install

```bash
npm install @yieldfy/sdk
```

## Usage (Phase 5 preview)

```ts
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Yieldfy, fetchAttestation } from "@yieldfy/sdk";

const client = new Yieldfy(provider, new PublicKey(PROGRAM_ID));
const att = await fetchAttestation(OPTIMIZER_URL, "balanced");
const sig = await client.deposit({ amount: 1_000_000n }, att);
```

## Publish pipeline

Tag the repo with `sdk-vX.Y.Z` matching `packages/sdk/package.json`. The `release-sdk.yml` GitHub Action builds, verifies the tag matches, then publishes to npm with provenance.
