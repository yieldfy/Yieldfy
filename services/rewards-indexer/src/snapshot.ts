/**
 * Solana state reader. Pulls every $YIELDFY token holder and every Yieldfy
 * vault Position PDA at a given slot, then joins them into per-wallet
 * `(yieldfyHeld, vaultUsd)` records consumable by the SDK scoring math.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  unpackAccount,
  type Account as SplAccount,
} from "@solana/spl-token";
import type { ParticipantInput } from "@yieldfy/sdk";

/**
 * Pull every SPL token account holding the given mint, sum balances per
 * owner. Returns owner -> raw token amount (decimals applied).
 */
export async function fetchTokenHoldings(
  conn: Connection,
  mint: PublicKey,
  decimals: number,
): Promise<Map<string, number>> {
  // Standard token account size = 165. Mint pubkey is at offset 0.
  const accounts = await conn.getProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      { dataSize: 165 },
      { memcmp: { offset: 0, bytes: mint.toBase58() } },
    ],
  });

  const ownerToBalance = new Map<string, number>();
  const divisor = Math.pow(10, decimals);

  for (const { pubkey, account } of accounts) {
    let parsed: SplAccount;
    try {
      parsed = unpackAccount(pubkey, account);
    } catch {
      continue; // skip token-2022 quirks etc
    }
    const owner = parsed.owner.toBase58();
    const amount = Number(parsed.amount) / divisor;
    if (amount === 0) continue;
    ownerToBalance.set(owner, (ownerToBalance.get(owner) ?? 0) + amount);
  }
  return ownerToBalance;
}

/**
 * Yieldfy `Position` account on-chain layout:
 *   8  bytes  anchor discriminator
 *   32 bytes  owner (Pubkey)
 *   1  byte   venue
 *   8  bytes  principal (u64, raw wXRP lamports — 6 decimals)
 *   8  bytes  receipt_supply (u64)
 *   8  bytes  last_update (i64)
 *   1  byte   bump
 *
 * We only need owner + principal for scoring.
 */
const POSITION_SIZE = 8 + 32 + 1 + 8 + 8 + 8 + 1;

export interface PositionRow {
  owner: string;
  principalWxrp: number;
}

export async function fetchVaultPositions(
  conn: Connection,
  programId: PublicKey,
): Promise<PositionRow[]> {
  const accounts = await conn.getProgramAccounts(programId, {
    filters: [{ dataSize: POSITION_SIZE }],
  });

  const positions: PositionRow[] = [];
  for (const { account } of accounts) {
    const data = account.data;
    // owner @ offset 8..40
    const owner = new PublicKey(data.subarray(8, 40)).toBase58();
    // principal @ offset 41..49 (after the 1-byte venue)
    const principalRaw = data.readBigUInt64LE(41);
    const principalWxrp = Number(principalRaw) / 1_000_000; // 6 decimals
    positions.push({ owner, principalWxrp });
  }
  return positions;
}

/**
 * Join token holdings + vault positions into the SDK's ParticipantInput shape.
 * vaultUsd = principalWxrp × wxrpPriceUsd. Wallets present in only one set
 * are still emitted (their dual-gate score will be 0 in the SDK).
 */
export function buildParticipants(
  holdings: Map<string, number>,
  positions: PositionRow[],
  wxrpPriceUsd: number,
): ParticipantInput[] {
  const wallets = new Set<string>();
  holdings.forEach((_, k) => wallets.add(k));
  positions.forEach((p) => wallets.add(p.owner));

  const positionByOwner = new Map<string, number>();
  for (const p of positions) {
    positionByOwner.set(p.owner, (positionByOwner.get(p.owner) ?? 0) + p.principalWxrp);
  }

  return Array.from(wallets).map((wallet) => ({
    wallet,
    yieldfyHeld: holdings.get(wallet) ?? 0,
    vaultUsd: (positionByOwner.get(wallet) ?? 0) * wxrpPriceUsd,
  }));
}
