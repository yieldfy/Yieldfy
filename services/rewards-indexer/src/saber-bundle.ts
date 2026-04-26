/**
 * Pure builder for the inner instruction sequence that publishes one epoch
 * to Saber's deployed merkle-distributor on-chain.
 *
 * The Squads vault PDA pays rent and funds the wSOL pool; an "ephemeral
 * signer" (a per-tx PDA owned by the multisig) becomes the distributor's
 * `base` keypair. Both signing identities are controlled by Squads — the
 * indexer never holds either key directly.
 *
 * Bundle (4 ixs, all signed by vault + ephemeral at execute time):
 *   1. createATA(distributor wSOL ATA, payer = vault)
 *   2. SystemProgram.transfer(vault → distributor ATA, totalLamports)
 *   3. SyncNative(distributor ATA)        — converts lamports to wSOL token amount
 *   4. saber.new_distributor(root, maxTotalClaim, maxNumNodes)
 *
 * Wrapped by saber-publisher.ts into a Squads V4 vault transaction proposal.
 */

import {
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  NATIVE_MINT,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  buildSaberNewDistributorIx,
  findSaberDistributorPda,
} from "@yieldfy/sdk";
import type { EpochResult } from "./storage.js";

export interface BundleArgs {
  /** Squads vault PDA — pays rent + funds the wSOL distributor ATA. */
  vaultPda: PublicKey;
  /** Ephemeral signer the multisig generates for this proposal. Becomes the Saber distributor's `base`. */
  ephemeralBase: PublicKey;
  /** The epoch to publish. Must already have a non-zero pool. */
  epoch: EpochResult;
}

export interface BuiltBundle {
  ixs: TransactionInstruction[];
  /** Saber distributor PDA derived from ephemeralBase — what we persist post-execution. */
  distributorPda: PublicKey;
  /** Distributor's wSOL ATA (the token account holding claimable wSOL). */
  distributorWsolAta: PublicKey;
  totalLamports: bigint;
  numNodes: bigint;
}

export function buildSaberPublishBundle(args: BundleArgs): BuiltBundle {
  const totalLamports = BigInt(args.epoch.totalLamports);
  const numNodes = BigInt(Object.keys(args.epoch.claims).length);
  if (totalLamports === 0n || numNodes === 0n) {
    throw new Error("saber-bundle: nothing to publish — empty pool");
  }

  const root = Buffer.from(
    args.epoch.merkleRoot.replace(/^0x/, ""),
    "hex",
  );
  if (root.length !== 32) {
    throw new Error(`saber-bundle: merkle root must be 32 bytes, got ${root.length}`);
  }

  const [distributorPda] = findSaberDistributorPda(args.ephemeralBase);
  const distributorWsolAta = getAssociatedTokenAddressSync(
    NATIVE_MINT,
    distributorPda,
    true, // PDA is off-curve
  );

  const ixs: TransactionInstruction[] = [
    createAssociatedTokenAccountIdempotentInstruction(
      args.vaultPda,
      distributorWsolAta,
      distributorPda,
      NATIVE_MINT,
    ),
    SystemProgram.transfer({
      fromPubkey: args.vaultPda,
      toPubkey: distributorWsolAta,
      lamports: totalLamports,
    }),
    createSyncNativeInstruction(distributorWsolAta),
    buildSaberNewDistributorIx(
      { base: args.ephemeralBase, mint: NATIVE_MINT, payer: args.vaultPda },
      { root, maxTotalClaim: totalLamports, maxNumNodes: numNodes },
    ),
  ];

  return {
    ixs,
    distributorPda,
    distributorWsolAta,
    totalLamports,
    numNodes,
  };
}
