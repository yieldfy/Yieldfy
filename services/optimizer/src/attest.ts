import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { VENUE_CODE, type VenueKey } from "./score.js";

function loadSigner(): Keypair {
  const envKey = process.env.YIELDFY_ATTESTOR_KEY;
  if (envKey) {
    try {
      const bytes = Uint8Array.from(JSON.parse(envKey));
      return Keypair.fromSecretKey(bytes);
    } catch (e) {
      throw new Error(
        `YIELDFY_ATTESTOR_KEY could not be parsed. Expected a JSON array of 64 bytes (solana-keygen output). ${String(e)}`,
      );
    }
  }
  const kp = Keypair.generate();
  // eslint-disable-next-line no-console
  console.warn(
    `[attest] YIELDFY_ATTESTOR_KEY is not set — generated an ephemeral attestor ${kp.publicKey.toBase58()}. Set YIELDFY_ATTESTOR_KEY to persist across restarts.`,
  );
  return kp;
}

const signer = loadSigner();
export const attestorPubkey = signer.publicKey.toBase58();

export type Attestation = {
  venue: VenueKey;
  venueCode: number;
  slot: string; // bigint → decimal string for JSON safety
  sigHex: string;
  pubkeyBase58: string;
};

/**
 * Build the 9-byte message [venue_u8, slot_u64_le] and sign with ed25519.
 * Matches `verify()` in programs/yieldfy/src/attest.rs (§07 of the engineering plan).
 */
export function signAttestation(venue: VenueKey, slot: bigint): Attestation {
  const venueCode = VENUE_CODE[venue];
  const msg = Buffer.alloc(9);
  msg[0] = venueCode;
  msg.writeBigUInt64LE(slot, 1);
  const sig = nacl.sign.detached(msg, signer.secretKey);
  return {
    venue,
    venueCode,
    slot: slot.toString(),
    sigHex: Buffer.from(sig).toString("hex"),
    pubkeyBase58: attestorPubkey,
  };
}
