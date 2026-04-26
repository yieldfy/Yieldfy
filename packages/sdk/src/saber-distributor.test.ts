import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  SABER_DISTRIBUTOR_PROGRAM_ID,
  SABER_DISTRIBUTOR_SEED,
  SABER_CLAIM_STATUS_SEED,
  findSaberDistributorPda,
  findSaberClaimStatusPda,
  buildSaberNewDistributorIx,
  buildSaberClaimIx,
} from "./saber-distributor.js";

const NATIVE_MINT = new PublicKey("So11111111111111111111111111111111111111112");

function discrim(name: string): Buffer {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

describe("SABER_DISTRIBUTOR_PROGRAM_ID", () => {
  it("is the canonical mainnet program ID", () => {
    expect(SABER_DISTRIBUTOR_PROGRAM_ID.toBase58()).toBe(
      "MRKGLMizK9XSTaD1d1jbVkdHZbQVCSnPpYiTw9aKQv8",
    );
  });
});

describe("PDA derivation", () => {
  it("findSaberDistributorPda matches manual derivation", () => {
    const base = Keypair.generate().publicKey;
    const [pda, bump] = findSaberDistributorPda(base);
    const [expected, expectedBump] = PublicKey.findProgramAddressSync(
      [SABER_DISTRIBUTOR_SEED, base.toBuffer()],
      SABER_DISTRIBUTOR_PROGRAM_ID,
    );
    expect(pda.toBase58()).toBe(expected.toBase58());
    expect(bump).toBe(expectedBump);
  });

  it("findSaberClaimStatusPda is deterministic on (distributor, index_le_u64)", () => {
    const distributor = Keypair.generate().publicKey;
    const [a] = findSaberClaimStatusPda(distributor, 7n);
    const [b] = findSaberClaimStatusPda(distributor, 7n);
    expect(a.toBase58()).toBe(b.toBase58());

    const [c] = findSaberClaimStatusPda(distributor, 8n);
    expect(c.toBase58()).not.toBe(a.toBase58());
  });
});

describe("buildSaberNewDistributorIx", () => {
  const base = Keypair.generate().publicKey;
  const payer = Keypair.generate().publicKey;
  const root = Buffer.alloc(32, 0xab);
  const ix = buildSaberNewDistributorIx(
    { base, mint: NATIVE_MINT, payer },
    { root, maxTotalClaim: 10_000_000n, maxNumNodes: 5n },
  );

  it("targets the saber program", () => {
    expect(ix.programId.equals(SABER_DISTRIBUTOR_PROGRAM_ID)).toBe(true);
  });

  it("starts with the canonical Anchor discriminator for new_distributor", () => {
    const data = Buffer.from(ix.data);
    expect(data.subarray(0, 8).equals(discrim("new_distributor"))).toBe(true);
  });

  it("encodes args as bump || root || u64 max_total_claim || u64 max_num_nodes", () => {
    const data = Buffer.from(ix.data);
    expect(data.length).toBe(8 + 1 + 32 + 8 + 8);
    expect(data.readUInt8(8)).toBe(0); // _bump vestigial
    expect(data.subarray(9, 9 + 32).equals(root)).toBe(true);
    expect(data.readBigUInt64LE(9 + 32)).toBe(10_000_000n);
    expect(data.readBigUInt64LE(9 + 32 + 8)).toBe(5n);
  });

  it("orders accounts: base(s), distributor(w), mint, payer(s,w), system_program", () => {
    const [distributor] = findSaberDistributorPda(base);
    expect(ix.keys.map((k) => k.pubkey.toBase58())).toEqual([
      base.toBase58(),
      distributor.toBase58(),
      NATIVE_MINT.toBase58(),
      payer.toBase58(),
      SystemProgram.programId.toBase58(),
    ]);
    expect(ix.keys[0]).toMatchObject({ isSigner: true, isWritable: false });
    expect(ix.keys[1]).toMatchObject({ isSigner: false, isWritable: true });
    expect(ix.keys[3]).toMatchObject({ isSigner: true, isWritable: true });
  });

  it("rejects non-32-byte roots", () => {
    expect(() =>
      buildSaberNewDistributorIx(
        { base, mint: NATIVE_MINT, payer },
        { root: new Uint8Array(31), maxTotalClaim: 1n, maxNumNodes: 1n },
      ),
    ).toThrow(/32 bytes/);
  });
});

describe("buildSaberClaimIx", () => {
  const distributor = Keypair.generate().publicKey;
  const claimant = Keypair.generate().publicKey;
  const from = Keypair.generate().publicKey;
  const to = Keypair.generate().publicKey;
  const proof = [
    Buffer.alloc(32, 1),
    Buffer.alloc(32, 2),
    Buffer.alloc(32, 3),
  ];
  const ix = buildSaberClaimIx(
    { distributor, claimant, from, to },
    { index: 3n, amount: 250_000n, proof },
  );

  it("starts with the canonical Anchor discriminator for claim", () => {
    const data = Buffer.from(ix.data);
    expect(data.subarray(0, 8).equals(discrim("claim"))).toBe(true);
  });

  it("encodes args as bump || u64 index || u64 amount || vec<[u8;32]> proof", () => {
    const data = Buffer.from(ix.data);
    expect(data.length).toBe(8 + 1 + 8 + 8 + 4 + 32 * proof.length);
    expect(data.readUInt8(8)).toBe(0);
    expect(data.readBigUInt64LE(9)).toBe(3n);
    expect(data.readBigUInt64LE(17)).toBe(250_000n);
    expect(data.readUInt32LE(25)).toBe(proof.length);
    expect(data.subarray(29, 29 + 32).equals(proof[0]!)).toBe(true);
    expect(data.subarray(29 + 32, 29 + 64).equals(proof[1]!)).toBe(true);
    expect(data.subarray(29 + 64, 29 + 96).equals(proof[2]!)).toBe(true);
  });

  it("accepts hex-string proofs (with and without 0x prefix)", () => {
    const hex = ["0x" + "aa".repeat(32), "bb".repeat(32)];
    const ix2 = buildSaberClaimIx(
      { distributor, claimant, from, to },
      { index: 0n, amount: 1n, proof: hex },
    );
    const data = Buffer.from(ix2.data);
    const proofStart = 8 + 1 + 8 + 8 + 4;
    expect(data.subarray(proofStart, proofStart + 32).equals(Buffer.alloc(32, 0xaa))).toBe(true);
    expect(data.subarray(proofStart + 32, proofStart + 64).equals(Buffer.alloc(32, 0xbb))).toBe(true);
  });

  it("orders accounts: distributor(w), claim_status(w), from(w), to(w), claimant(s), payer(s,w), system, token", () => {
    const [claimStatus] = findSaberClaimStatusPda(distributor, 3n);
    expect(ix.keys.map((k) => k.pubkey.toBase58())).toEqual([
      distributor.toBase58(),
      claimStatus.toBase58(),
      from.toBase58(),
      to.toBase58(),
      claimant.toBase58(),
      claimant.toBase58(), // payer defaults to claimant
      SystemProgram.programId.toBase58(),
      TOKEN_PROGRAM_ID.toBase58(),
    ]);
    expect(ix.keys[4]).toMatchObject({ isSigner: true, isWritable: false });
    expect(ix.keys[5]).toMatchObject({ isSigner: true, isWritable: true });
  });

  it("respects an explicit payer when given", () => {
    const payer = Keypair.generate().publicKey;
    const ix2 = buildSaberClaimIx(
      { distributor, claimant, from, to, payer },
      { index: 0n, amount: 1n, proof: [] },
    );
    expect(ix2.keys[5]!.pubkey.toBase58()).toBe(payer.toBase58());
  });

  it("rejects malformed proof entries", () => {
    expect(() =>
      buildSaberClaimIx(
        { distributor, claimant, from, to },
        { index: 0n, amount: 1n, proof: [Buffer.alloc(31)] },
      ),
    ).toThrow(/32 bytes/);
  });
});
