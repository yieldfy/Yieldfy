import type { PublicKey } from "@solana/web3.js";

export type VenueKey = "kamino" | "marginfi" | "drift" | "meteora";

export const VENUE_CODE: Record<VenueKey, number> = {
  kamino: 0,
  marginfi: 1,
  drift: 2,
  meteora: 3,
};

export const VENUE_FROM_CODE: Record<number, VenueKey> = {
  0: "kamino",
  1: "marginfi",
  2: "drift",
  3: "meteora",
};

export type RiskProfile = "conservative" | "balanced" | "opportunistic";

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

export type ConfigAccount = {
  authority: PublicKey;
  wxrpMint: PublicKey;
  yxrpMint: PublicKey;
  attestor: PublicKey;
  maxSingleDeposit: bigint;
  stalenessSlots: bigint;
  paused: boolean;
  bump: number;
};

export type PositionAccount = {
  owner: PublicKey;
  venue: VenueKey;
  venueCode: number;
  principal: bigint;
  receiptSupply: bigint;
  lastUpdate: bigint;
  bump: number;
};
