/**
 * Merkle tree builder for per-wallet SOL claim proofs.
 *
 * Leaf format: keccak256(<index:u64 LE> || <wallet:32-byte pubkey> || <lamports:u64 LE>).
 * Matches Saber merkle-distributor (program MRKGLMizK9XSTaD1d1jbVkdHZbQVCSnPpYiTw9aKQv8)
 * — sorted-pair concat, keccak256 — so the root we publish here is directly
 * usable in Saber's `new_distributor` call.
 */

import { PublicKey } from "@solana/web3.js";
import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";

export interface ClaimLeaf {
  index: number;
  wallet: string;
  lamports: bigint;
}

function leafBuffer(leaf: ClaimLeaf): Buffer {
  const idx = Buffer.alloc(8);
  idx.writeBigUInt64LE(BigInt(leaf.index), 0);
  const pk = new PublicKey(leaf.wallet).toBuffer();
  const lp = Buffer.alloc(8);
  lp.writeBigUInt64LE(leaf.lamports, 0);
  return Buffer.concat([idx, pk, lp]);
}

function hashLeaf(leaf: ClaimLeaf): Buffer {
  return keccak256(leafBuffer(leaf));
}

export interface BuiltTree {
  root: string; // hex-encoded keccak root
  leaves: Array<{ leaf: ClaimLeaf; proof: string[] }>;
}

/**
 * Build the merkle tree, return the root + per-wallet proof. The order of
 * `leaves` is preserved, which means leaf indices are 0..n-1 in input order.
 */
export function buildClaimTree(rawLeaves: Array<{ wallet: string; lamports: bigint }>): BuiltTree {
  const indexed: ClaimLeaf[] = rawLeaves.map((l, i) => ({
    index: i,
    wallet: l.wallet,
    lamports: l.lamports,
  }));
  const hashes = indexed.map(hashLeaf);

  const tree = new MerkleTree(hashes, keccak256, { sortPairs: true });
  const root = tree.getHexRoot();

  return {
    root,
    leaves: indexed.map((leaf, i) => ({
      leaf,
      proof: tree.getHexProof(hashes[i]!),
    })),
  };
}

/** Verify a claim proof outside the tree builder (used in tests + clients). */
export function verifyClaim(args: {
  leaf: ClaimLeaf;
  proof: string[];
  root: string;
}): boolean {
  const target = hashLeaf(args.leaf);
  const tree = new MerkleTree([], keccak256, { sortPairs: true });
  return tree.verify(args.proof, target, args.root);
}
