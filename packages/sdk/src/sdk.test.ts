import { describe, it, expect, vi } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  VENUE_CODE,
  buildAttestationMessage,
  buildAttestationPreIx,
  fetchAttestation,
  findConfigPda,
  findPositionPda,
  findVaultPda,
} from "./index.js";

const PROGRAM_ID = Keypair.generate().publicKey;

describe("PDA derivation", () => {
  it("config PDA is stable across calls", () => {
    const [a] = findConfigPda(PROGRAM_ID);
    const [b] = findConfigPda(PROGRAM_ID);
    expect(a.equals(b)).toBe(true);
  });

  it("different users yield different position PDAs", () => {
    const u1 = Keypair.generate().publicKey;
    const u2 = Keypair.generate().publicKey;
    const [p1] = findPositionPda(u1, PROGRAM_ID);
    const [p2] = findPositionPda(u2, PROGRAM_ID);
    expect(p1.equals(p2)).toBe(false);
  });

  it("vault PDA is derived from (vault_seed, mint)", () => {
    const mint = Keypair.generate().publicKey;
    const [v1] = findVaultPda(mint, PROGRAM_ID);
    const [v2] = findVaultPda(mint, PROGRAM_ID);
    expect(v1.equals(v2)).toBe(true);
  });
});

describe("attestation message", () => {
  it("packs [venue_u8, slot_u64_le] into exactly 9 bytes", () => {
    const msg = buildAttestationMessage(VENUE_CODE.kamino, 0x0102030405060708n);
    expect(msg).toHaveLength(9);
    expect(msg[0]).toBe(0);
    expect([...msg.slice(1)]).toEqual([8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it("build ed25519 pre-ix attaches to the ed25519 program", () => {
    const ix = buildAttestationPreIx({
      venue: "marginfi",
      venueCode: VENUE_CODE.marginfi,
      slot: "42",
      // zero-sig / zero-pubkey — only shape matters
      sigHex: "00".repeat(64),
      pubkeyBase58: "11111111111111111111111111111111",
    });
    expect(ix.programId.toBase58()).toBe("Ed25519SigVerify111111111111111111111111111");
  });
});

describe("fetchAttestation", () => {
  it("hits /attest and returns the attestation payload", async () => {
    const payload = {
      attestation: {
        venue: "kamino",
        venueCode: 0,
        slot: "100",
        sigHex: "aa".repeat(64),
        pubkeyBase58: "11111111111111111111111111111111",
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const att = await fetchAttestation("http://optimizer", "balanced");
    expect(att.venue).toBe("kamino");
    expect(fetchMock.mock.calls[0][0].toString()).toBe(
      "http://optimizer/attest?profile=balanced",
    );
  });

  it("throws on non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("nope", { status: 500 })),
    );
    await expect(fetchAttestation("http://optimizer")).rejects.toThrow(/500/);
  });
});
