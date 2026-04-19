import { describe, it, expect } from "vitest";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { signAttestation, attestorPubkey } from "./attest.js";
import { VENUE_CODE } from "./score.js";

const pubkeyBytes = () => new PublicKey(attestorPubkey).toBytes();

describe("signAttestation", () => {
  it("produces a 64-byte signature over [venue_u8, slot_u64_le]", () => {
    const slot = 123_456_789n;
    const att = signAttestation("marginfi", slot);

    expect(att.venue).toBe("marginfi");
    expect(att.venueCode).toBe(VENUE_CODE.marginfi);
    expect(att.slot).toBe("123456789");
    expect(att.sigHex).toHaveLength(128);
    expect(att.pubkeyBase58).toBe(attestorPubkey);
  });

  it("signs a message verifiable by nacl against the exposed pubkey", () => {
    const slot = 42n;
    const att = signAttestation("kamino", slot);

    const msg = Buffer.alloc(9);
    msg[0] = VENUE_CODE.kamino;
    msg.writeBigUInt64LE(slot, 1);

    const sig = Buffer.from(att.sigHex, "hex");
    expect(nacl.sign.detached.verify(msg, sig, pubkeyBytes())).toBe(true);
  });

  it("rejects verification when the message is tampered with", () => {
    const slot = 7n;
    const att = signAttestation("drift", slot);

    const tampered = Buffer.alloc(9);
    tampered[0] = VENUE_CODE.drift;
    tampered.writeBigUInt64LE(slot + 1n, 1);

    const sig = Buffer.from(att.sigHex, "hex");
    expect(nacl.sign.detached.verify(tampered, sig, pubkeyBytes())).toBe(false);
  });

  it("is deterministic for the same signer / venue / slot", () => {
    const a = signAttestation("meteora", 1000n);
    const b = signAttestation("meteora", 1000n);
    expect(a.sigHex).toBe(b.sigHex);
  });

  it("produces different sigs for different slots", () => {
    const a = signAttestation("kamino", 1n);
    const b = signAttestation("kamino", 2n);
    expect(a.sigHex).not.toBe(b.sigHex);
  });
});

describe("attestor identity", () => {
  it("exposes a valid Solana pubkey (32 bytes decoded)", () => {
    expect(pubkeyBytes().length).toBe(32);
  });
});
