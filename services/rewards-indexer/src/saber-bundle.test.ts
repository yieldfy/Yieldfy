import { describe, expect, it } from "vitest";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  NATIVE_MINT,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  SABER_DISTRIBUTOR_PROGRAM_ID,
  findSaberDistributorPda,
} from "@yieldfy/sdk";
import { buildSaberPublishBundle } from "./saber-bundle.js";
import type { EpochResult } from "./storage.js";

function fakeEpoch(overrides: Partial<EpochResult> = {}): EpochResult {
  const wallet = Keypair.generate().publicKey.toBase58();
  return {
    epochId: 0,
    startedAt: 0,
    endedAt: 0,
    snapshotSlot: null,
    marketCapUsd: 100_000,
    solPriceUsd: 100,
    poolUsd: 0.5,
    poolSol: 0.005,
    poolLamports: "5000000",
    merkleRoot: "0x" + "ab".repeat(32),
    participants: 1,
    scores: [],
    claims: {
      [wallet]: { index: 0, lamports: "5000000", proof: [] },
    },
    totalLamports: "5000000",
    saberDistributor: null,
    saberDistributorBase: null,
    saberPublishedAt: null,
    ...overrides,
  };
}

const vault = Keypair.generate().publicKey;
const ephemeralBase = Keypair.generate().publicKey;

describe("buildSaberPublishBundle", () => {
  it("returns 4 instructions in the canonical order", () => {
    const built = buildSaberPublishBundle({
      vaultPda: vault,
      ephemeralBase,
      epoch: fakeEpoch(),
    });
    expect(built.ixs).toHaveLength(4);

    // 1: createATA — owned by ATA program
    expect(built.ixs[0]!.programId.toBase58()).toBe(
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    );
    // 2: SystemProgram.transfer
    expect(built.ixs[1]!.programId.equals(SystemProgram.programId)).toBe(true);
    // 3: SPL Token SyncNative
    expect(built.ixs[2]!.programId.toBase58()).toBe(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    );
    // 4: Saber program
    expect(built.ixs[3]!.programId.equals(SABER_DISTRIBUTOR_PROGRAM_ID)).toBe(
      true,
    );
  });

  it("uses the vault as funder of the wSOL ATA + transfer", () => {
    const built = buildSaberPublishBundle({
      vaultPda: vault,
      ephemeralBase,
      epoch: fakeEpoch(),
    });
    // SystemProgram.transfer keys: [from, to]
    expect(built.ixs[1]!.keys[0]!.pubkey.equals(vault)).toBe(true);
    expect(built.ixs[1]!.keys[0]!.isSigner).toBe(true);
  });

  it("derives distributor PDA from ephemeral base", () => {
    const built = buildSaberPublishBundle({
      vaultPda: vault,
      ephemeralBase,
      epoch: fakeEpoch(),
    });
    const [expected] = findSaberDistributorPda(ephemeralBase);
    expect(built.distributorPda.equals(expected)).toBe(true);
    expect(
      built.distributorWsolAta.equals(
        getAssociatedTokenAddressSync(NATIVE_MINT, expected, true),
      ),
    ).toBe(true);
  });

  it("transfers exactly totalLamports", () => {
    const built = buildSaberPublishBundle({
      vaultPda: vault,
      ephemeralBase,
      epoch: fakeEpoch({ totalLamports: "12345" }),
    });
    expect(built.totalLamports).toBe(12345n);
  });

  it("counts num_nodes from the claims map", () => {
    const w1 = Keypair.generate().publicKey.toBase58();
    const w2 = Keypair.generate().publicKey.toBase58();
    const w3 = Keypair.generate().publicKey.toBase58();
    const built = buildSaberPublishBundle({
      vaultPda: vault,
      ephemeralBase,
      epoch: fakeEpoch({
        claims: {
          [w1]: { index: 0, lamports: "1000", proof: [] },
          [w2]: { index: 1, lamports: "2000", proof: [] },
          [w3]: { index: 2, lamports: "3000", proof: [] },
        },
        totalLamports: "6000",
      }),
    });
    expect(built.numNodes).toBe(3n);
  });

  it("rejects empty-pool epochs", () => {
    expect(() =>
      buildSaberPublishBundle({
        vaultPda: vault,
        ephemeralBase,
        epoch: fakeEpoch({ totalLamports: "0", claims: {} }),
      }),
    ).toThrow(/empty pool/);
  });

  it("rejects malformed merkle roots", () => {
    expect(() =>
      buildSaberPublishBundle({
        vaultPda: vault,
        ephemeralBase,
        epoch: fakeEpoch({ merkleRoot: "0xab" }),
      }),
    ).toThrow(/32 bytes/);
  });

  it("accepts merkle roots with or without 0x prefix", () => {
    const a = buildSaberPublishBundle({
      vaultPda: vault,
      ephemeralBase,
      epoch: fakeEpoch({ merkleRoot: "ab".repeat(32) }),
    });
    const b = buildSaberPublishBundle({
      vaultPda: vault,
      ephemeralBase,
      epoch: fakeEpoch({ merkleRoot: "0x" + "ab".repeat(32) }),
    });
    expect(a.distributorPda.equals(b.distributorPda)).toBe(true);
  });
});
