/**
 * Epoch orchestrator. One call = one full distribution cycle:
 *   1. snapshot Solana state (token holders + vault positions)
 *   2. fetch market prices, derive MC
 *   3. score every participant (SDK math)
 *   4. build merkle tree of (wallet → SOL lamports) claims
 *   5. persist EpochResult
 *
 * Pre-launch (no $YIELDFY mint set), the function still snapshots vault
 * positions and writes an empty-pool epoch — useful for sanity-checking the
 * pipeline against live data without minting tokens yet.
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  DEFAULT_REWARD_PARAMS,
  distributeEpoch,
  type RewardParams,
} from "@yieldfy/sdk";
import { sampleMarket } from "./oracle.js";
import { buildParticipants, fetchTokenHoldings, fetchVaultPositions } from "./snapshot.js";
import { buildClaimTree } from "./merkle.js";
import { EpochStorage, type EpochResult } from "./storage.js";

export interface RunEpochArgs {
  conn: Connection;
  storage: EpochStorage;
  yieldfyMint: string | null;
  yieldfySupply: number;
  yieldfyDecimals: number;
  wxrpMint: string;
  yieldfyProgramId: string;
  paramOverrides?: Partial<RewardParams>;
}

export async function runEpoch(args: RunEpochArgs): Promise<EpochResult> {
  const startedAt = Date.now();
  const params: RewardParams = { ...DEFAULT_REWARD_PARAMS, ...args.paramOverrides };

  const market = await sampleMarket({
    yieldfyMint: args.yieldfyMint,
    yieldfySupply: args.yieldfySupply,
    wxrpMint: args.wxrpMint,
  });
  if (!market) {
    throw new Error("[epoch] market sample failed; aborting epoch publish");
  }

  // Concurrent on-chain reads.
  const slot = await args.conn.getSlot("confirmed");
  const [holdings, positions] = await Promise.all([
    args.yieldfyMint
      ? fetchTokenHoldings(args.conn, new PublicKey(args.yieldfyMint), args.yieldfyDecimals)
      : Promise.resolve(new Map<string, number>()),
    fetchVaultPositions(args.conn, new PublicKey(args.yieldfyProgramId)),
  ]);

  const participants = buildParticipants(holdings, positions, market.wxrpPriceUsd);

  const { pool, scores } = distributeEpoch(
    participants,
    market.yieldfyMarketCapUsd,
    market.solPriceUsd,
    params,
  );

  // Build merkle tree of non-zero claims.
  const claimable = scores.filter((s) => s.eligible && s.solReward > 0);
  const tree = buildClaimTree(
    claimable.map((s) => ({
      wallet: s.wallet,
      lamports: BigInt(Math.floor(s.solReward * LAMPORTS_PER_SOL)),
    })),
  );

  const claims: EpochResult["claims"] = {};
  let totalLamports = 0n;
  for (const { leaf, proof } of tree.leaves) {
    claims[leaf.wallet] = {
      index: leaf.index,
      lamports: leaf.lamports.toString(),
      proof,
    };
    totalLamports += leaf.lamports;
  }

  const epochId = await nextEpochId(args.storage);
  const result: EpochResult = {
    epochId,
    startedAt,
    endedAt: Date.now(),
    snapshotSlot: slot,
    marketCapUsd: market.yieldfyMarketCapUsd,
    solPriceUsd: market.solPriceUsd,
    poolUsd: pool.usd,
    poolSol: pool.sol,
    poolLamports: BigInt(Math.floor(pool.sol * LAMPORTS_PER_SOL)).toString(),
    merkleRoot: tree.root,
    participants: participants.length,
    scores,
    claims,
    totalLamports: totalLamports.toString(),
    saberDistributor: null,
    saberDistributorBase: null,
    saberPublishedAt: null,
  };
  await args.storage.write(result);
  return result;
}

async function nextEpochId(storage: EpochStorage): Promise<number> {
  const ids = await storage.listEpochIds();
  return (ids.at(-1) ?? -1) + 1;
}
