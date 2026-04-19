// @yieldfy/sdk — scaffold.
//
// The typed Yieldfy client lands once yieldfy publishes the Anchor IDL for the
// programs/yieldfy program (Phase 5 of the engineering plan). This module
// exports only the attestation shape and a placeholder client stub so
// downstream consumers can start wiring integration code without waiting for
// the on-chain surface.

export type VenueKey = "kamino" | "marginfi" | "drift" | "meteora";

export type Attestation = {
  venue: VenueKey;
  venueCode: number;
  /** Decimal string — bigint-safe for JSON transport. */
  slot: string;
  /** Hex-encoded 64-byte ed25519 signature. */
  sigHex: string;
  /** Base58-encoded signer pubkey. */
  pubkeyBase58: string;
};

export type DepositParams = {
  /** wXRP base units (decimals = 6). */
  amount: bigint;
};

/**
 * Fetch a signed attestation from the Yieldfy optimizer service.
 * Works today; used by the full SDK client once Phase 5 wires deposit/withdraw.
 */
export async function fetchAttestation(
  optimizerUrl: string,
  profile: "conservative" | "balanced" | "opportunistic" = "balanced",
): Promise<Attestation> {
  const url = new URL("/attest", optimizerUrl);
  url.searchParams.set("profile", profile);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`optimizer /attest failed: ${res.status}`);
  const body = (await res.json()) as { attestation: Attestation };
  return body.attestation;
}

export const SDK_VERSION = "0.0.1";
