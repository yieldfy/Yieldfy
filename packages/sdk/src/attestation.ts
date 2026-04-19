import { Ed25519Program, PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { Attestation } from "./types.js";

/**
 * Build the 9-byte `[venue_u8, slot_u64_le]` message the Anchor ed25519
 * precompile check expects (§07 of the engineering plan).
 */
export function buildAttestationMessage(venueCode: number, slot: bigint): Buffer {
  const msg = Buffer.alloc(9);
  msg[0] = venueCode;
  msg.writeBigUInt64LE(slot, 1);
  return msg;
}

/**
 * Build the ed25519 pre-instruction the Anchor program reads at ix-index 0.
 */
export function buildAttestationPreIx(att: Attestation): TransactionInstruction {
  const message = buildAttestationMessage(att.venueCode, BigInt(att.slot));
  return Ed25519Program.createInstructionWithPublicKey({
    publicKey: new PublicKey(att.pubkeyBase58).toBytes(),
    message,
    signature: Buffer.from(att.sigHex, "hex"),
  });
}

/** Fetch a signed attestation from the Yieldfy optimizer service. */
export async function fetchAttestation(
  optimizerUrl: string,
  profile: "conservative" | "balanced" | "opportunistic" = "balanced",
): Promise<Attestation> {
  const url = new URL("/attest", optimizerUrl);
  url.searchParams.set("profile", profile);
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`optimizer /attest failed: ${res.status} ${text}`.trim());
  }
  const body = (await res.json()) as { attestation: Attestation };
  return body.attestation;
}
