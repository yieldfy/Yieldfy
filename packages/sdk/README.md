# @yieldfy/sdk

Typed TypeScript client for the [Yieldfy](https://github.com/yieldfy/Yieldfy) Anchor program — wXRP auto-router on Solana.

## Install

This package is published to **GitHub Packages**. Add this line to a `.npmrc` in your project root (or `~/.npmrc`):

```
@yieldfy:registry=https://npm.pkg.github.com
```

Then:

```bash
npm install @yieldfy/sdk
```

> GitHub Packages requires a personal access token with `read:packages` scope even for public packages. Generate one at <https://github.com/settings/tokens> and run `npm login --registry=https://npm.pkg.github.com` once.

## Quick start

```ts
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Yieldfy, fetchAttestation, VENUE_CODE } from "@yieldfy/sdk";

const PROGRAM_ID = "3PY2nY7UVQR327WeSdJFrsrcrqhD4wE2CHg4ZcDarGDE"; // devnet
const OPTIMIZER_URL = "https://optimizer.yieldfy.ai";

const client = new Yieldfy(provider, new PublicKey(PROGRAM_ID));
const attestation = await fetchAttestation(OPTIMIZER_URL);
const sig = await client.deposit(
  { amount: 10_000_000n, expectedVenue: VENUE_CODE.kamino },
  attestation,
);
```

## Surface

- **`Yieldfy`** — typed wrapper around the Anchor program: `deposit()`, `withdraw()`, `readPosition()`, `fetchConfig()`.
- **`fetchAttestation(optimizerUrl, profile?)`** — calls the optimizer's `/attest` endpoint and returns the signed attestation payload.
- **PDA helpers** — `findConfigPda`, `findPositionPda`, `findVaultPda`.
- **Types** — `Attestation`, `VenueKey`, `DepositParams`, `ConfigAccount`, `PositionAccount`, `RiskProfile`.
- **ed25519 pre-instruction builder** — `buildAttestationPreIx(attestation)` assembles the ed25519 verify instruction the program expects directly before `deposit`.

## Frontend template

A minimal React example lives at [`template/DepositFlow.tsx`](https://github.com/yieldfy/Yieldfy/blob/main/template/DepositFlow.tsx) in the main repo.

## Publish pipeline

Tag the repo with `sdk-vX.Y.Z` matching `packages/sdk/package.json`. The `release-sdk.yml` GitHub Action builds, verifies the tag matches, then publishes to npm with provenance.
