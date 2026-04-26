import { describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";
import { buildClaimTree, verifyClaim } from "./merkle.js";

describe("merkle claim tree", () => {
  it("produces a stable root for same inputs", () => {
    const wallets = Array.from({ length: 5 }, () => Keypair.generate().publicKey.toBase58());
    const leaves = wallets.map((w, i) => ({ wallet: w, lamports: BigInt(1_000 + i) }));
    const a = buildClaimTree(leaves);
    const b = buildClaimTree(leaves);
    expect(a.root).toBe(b.root);
  });

  it("each leaf's proof verifies against the root", () => {
    const wallets = Array.from({ length: 7 }, () => Keypair.generate().publicKey.toBase58());
    const leaves = wallets.map((w, i) => ({ wallet: w, lamports: BigInt(10_000_000 * (i + 1)) }));
    const tree = buildClaimTree(leaves);

    for (const { leaf, proof } of tree.leaves) {
      expect(verifyClaim({ leaf, proof, root: tree.root })).toBe(true);
    }
  });

  it("a forged leaf does not verify", () => {
    const wallets = Array.from({ length: 4 }, () => Keypair.generate().publicKey.toBase58());
    const tree = buildClaimTree(wallets.map((w, i) => ({ wallet: w, lamports: BigInt(1_000) })));

    const realLeaf = tree.leaves[0]!;
    const forged = {
      leaf: { ...realLeaf.leaf, lamports: BigInt(999_999_999) },
      proof: realLeaf.proof,
      root: tree.root,
    };
    expect(verifyClaim(forged)).toBe(false);
  });

  it("handles a single-leaf tree", () => {
    const w = Keypair.generate().publicKey.toBase58();
    const tree = buildClaimTree([{ wallet: w, lamports: BigInt(42) }]);
    expect(tree.leaves.length).toBe(1);
    expect(verifyClaim({ leaf: tree.leaves[0]!.leaf, proof: tree.leaves[0]!.proof, root: tree.root })).toBe(true);
  });

  it("handles an empty input — empty tree, no leaves", () => {
    const tree = buildClaimTree([]);
    expect(tree.leaves).toEqual([]);
    expect(typeof tree.root).toBe("string");
  });
});
