/**
 * Thin client for Saber's deployed merkle-distributor program
 * (MRKGLMizK9XSTaD1d1jbVkdHZbQVCSnPpYiTw9aKQv8).
 *
 * We talk to the on-chain program directly rather than through
 * @saberhq/merkle-distributor — that npm package was last published in 2022
 * and has peer-deps on the dead @project-serum/anchor. The on-chain program
 * itself is rock-solid; only the SDK rotted.
 *
 * Instructions are built manually (8-byte Anchor discriminator + Borsh-encoded
 * args + account list) so we avoid Anchor 0.30 vs 0.24 IDL-spec friction.
 *
 * Used by:
 *   - services/rewards-indexer  — saber-publisher (newDistributor each epoch)
 *   - apps/dashboard            — useRewardsClaim (one claim per user/epoch)
 */

import {
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export const SABER_DISTRIBUTOR_PROGRAM_ID = new PublicKey(
  "MRKGLMizK9XSTaD1d1jbVkdHZbQVCSnPpYiTw9aKQv8",
);

export const SABER_DISTRIBUTOR_SEED = Buffer.from("MerkleDistributor");
export const SABER_CLAIM_STATUS_SEED = Buffer.from("ClaimStatus");

// Anchor discriminators: sha256("global:<snake_case>")[0..8]
const DISC_NEW_DISTRIBUTOR = Buffer.from([32, 139, 112, 171, 0, 2, 225, 155]);
const DISC_CLAIM = Buffer.from([62, 198, 214, 193, 213, 159, 108, 210]);

/** Distributor PDA: seeds = ["MerkleDistributor", base.key()] */
export function findSaberDistributorPda(base: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SABER_DISTRIBUTOR_SEED, base.toBuffer()],
    SABER_DISTRIBUTOR_PROGRAM_ID,
  );
}

/** ClaimStatus PDA: seeds = ["ClaimStatus", index_le_u64, distributor.key()] */
export function findSaberClaimStatusPda(
  distributor: PublicKey,
  index: bigint,
): [PublicKey, number] {
  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(index, 0);
  return PublicKey.findProgramAddressSync(
    [SABER_CLAIM_STATUS_SEED, indexBuf, distributor.toBuffer()],
    SABER_DISTRIBUTOR_PROGRAM_ID,
  );
}

// ─── new_distributor ─────────────────────────────────────────────────────────

export interface NewDistributorAccounts {
  /** Fresh keypair per epoch — signs once during creation, never used again. */
  base: PublicKey;
  /** SPL mint of the distributed token. For us, NATIVE_MINT (wSOL). */
  mint: PublicKey;
  /** Pays the rent for the distributor account. Squads vault in our flow. */
  payer: PublicKey;
}

export interface NewDistributorArgs {
  /** 32-byte keccak merkle root of all (index, claimant, amount) leaves. */
  root: Uint8Array;
  /** Sum of `amount` across every leaf. The program enforces this cap. */
  maxTotalClaim: bigint;
  /** Number of leaves. The program enforces this cap. */
  maxNumNodes: bigint;
}

export function buildSaberNewDistributorIx(
  accounts: NewDistributorAccounts,
  args: NewDistributorArgs,
): TransactionInstruction {
  if (args.root.length !== 32) {
    throw new Error(`saber: root must be 32 bytes, got ${args.root.length}`);
  }
  const [distributor] = findSaberDistributorPda(accounts.base);

  // Borsh: u8 bump || [u8;32] root || u64 max_total_claim || u64 max_num_nodes
  const data = Buffer.alloc(8 + 1 + 32 + 8 + 8);
  let off = 0;
  DISC_NEW_DISTRIBUTOR.copy(data, off); off += 8;
  data.writeUInt8(0, off); off += 1; // _bump arg is vestigial; program uses canonical bump
  Buffer.from(args.root).copy(data, off); off += 32;
  data.writeBigUInt64LE(args.maxTotalClaim, off); off += 8;
  data.writeBigUInt64LE(args.maxNumNodes, off);

  return {
    programId: SABER_DISTRIBUTOR_PROGRAM_ID,
    keys: [
      { pubkey: accounts.base, isSigner: true, isWritable: false },
      { pubkey: distributor, isSigner: false, isWritable: true },
      { pubkey: accounts.mint, isSigner: false, isWritable: false },
      { pubkey: accounts.payer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

// ─── claim ───────────────────────────────────────────────────────────────────

export interface ClaimAccounts {
  /** The distributor PDA (derive via findSaberDistributorPda). */
  distributor: PublicKey;
  /** Claimant's wallet. Must match `to.owner` and is a signer. */
  claimant: PublicKey;
  /** Pays rent for the ClaimStatus PDA. Defaults to claimant. */
  payer?: PublicKey;
  /** Distributor's token ATA — getAssociatedTokenAddressSync(mint, distributor, true). */
  from: PublicKey;
  /** Claimant's token ATA — must exist before this ix (use createAssociatedTokenAccountIdempotentInstruction in the same tx). */
  to: PublicKey;
}

export interface ClaimArgs {
  /** Leaf index in the merkle tree (matches the indexer's published claim). */
  index: bigint;
  /** Token amount in base units (lamports for wSOL). */
  amount: bigint;
  /** Proof siblings, each 32 bytes. Accepts hex strings (0x-prefixed or not) or raw byte arrays. */
  proof: Array<Uint8Array | string>;
}

function proofToBytes(p: Array<Uint8Array | string>): Buffer[] {
  return p.map((entry, i) => {
    const buf =
      typeof entry === "string"
        ? Buffer.from(entry.startsWith("0x") ? entry.slice(2) : entry, "hex")
        : Buffer.from(entry);
    if (buf.length !== 32) {
      throw new Error(`saber: proof[${i}] must be 32 bytes, got ${buf.length}`);
    }
    return buf;
  });
}

export function buildSaberClaimIx(
  accounts: ClaimAccounts,
  args: ClaimArgs,
): TransactionInstruction {
  const payer = accounts.payer ?? accounts.claimant;
  const [claimStatus] = findSaberClaimStatusPda(accounts.distributor, args.index);
  const proofBufs = proofToBytes(args.proof);

  // Borsh: u8 bump || u64 index || u64 amount || vec<[u8;32]> proof (u32 len + N*32)
  const data = Buffer.alloc(8 + 1 + 8 + 8 + 4 + 32 * proofBufs.length);
  let off = 0;
  DISC_CLAIM.copy(data, off); off += 8;
  data.writeUInt8(0, off); off += 1; // _bump is vestigial
  data.writeBigUInt64LE(args.index, off); off += 8;
  data.writeBigUInt64LE(args.amount, off); off += 8;
  data.writeUInt32LE(proofBufs.length, off); off += 4;
  for (const sibling of proofBufs) {
    sibling.copy(data, off);
    off += 32;
  }

  return {
    programId: SABER_DISTRIBUTOR_PROGRAM_ID,
    keys: [
      { pubkey: accounts.distributor, isSigner: false, isWritable: true },
      { pubkey: claimStatus, isSigner: false, isWritable: true },
      { pubkey: accounts.from, isSigner: false, isWritable: true },
      { pubkey: accounts.to, isSigner: false, isWritable: true },
      { pubkey: accounts.claimant, isSigner: true, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  };
}
