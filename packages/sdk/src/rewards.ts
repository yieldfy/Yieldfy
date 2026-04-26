/**
 * SOL yield reward scoring for $YIELDFY × wXRP dual-stake distributions.
 *
 * Phase 2 launch mechanic: each weekly epoch, the protocol distributes a SOL
 * pool sized as a fraction of $YIELDFY market cap to users who simultaneously
 * (a) hold $YIELDFY and (b) hold wXRP in the Yieldfy vault. Both sides are
 * required — multiplicative gating means zero on either side → zero rewards.
 *
 * The formula intentionally uses sub-linear exponents on both inputs to
 * dampen whale dominance when the cohort is small.
 */

export interface RewardParams {
  /** Exponent applied to $YIELDFY token holdings. <1 dampens whales. */
  alpha: number;
  /** Exponent applied to USD value of wXRP in vault. */
  beta: number;
  /**
   * Fraction of $YIELDFY market cap distributed each epoch.
   * Default 0.000675 (0.0675% / week) — conservative launch rate. The protocol
   * raises this as TVL and MC scale.
   */
  distributionRatePerEpoch: number;
  /** Minimum $YIELDFY balance to be eligible for any reward. Anti-dust. */
  minYieldfy: number;
  /** Minimum USD wXRP vault balance to be eligible. Anti-dust. */
  minVaultUsd: number;
}

export const DEFAULT_REWARD_PARAMS: RewardParams = {
  alpha: 0.6, // token holding weighted slightly more
  beta: 0.4,
  distributionRatePerEpoch: 0.000675, // 0.0675% of MC per week — launch rate, scales up later
  minYieldfy: 1_000,
  minVaultUsd: 0.1,
};

export interface ParticipantInput {
  /** Wallet address (opaque — caller decides format). */
  wallet: string;
  /** $YIELDFY tokens held (raw count, NOT % of supply). */
  yieldfyHeld: number;
  /** USD value of user's wXRP vault position. */
  vaultUsd: number;
}

export interface ParticipantScore {
  wallet: string;
  /** Raw score before normalization. 0 if ineligible. */
  score: number;
  /** Pro-rata share of the epoch's SOL pool, in [0, 1]. */
  share: number;
  /** SOL the participant earns this epoch. */
  solReward: number;
  /** USD value of the SOL reward at the snapshot price. */
  usdReward: number;
  /** Whether the participant met both eligibility minimums. */
  eligible: boolean;
}

/**
 * Compute a single participant's raw score. Returns 0 if either side fails
 * the eligibility minimums — that's the dual-gate enforcement.
 */
export function computeScore(p: ParticipantInput, params: RewardParams = DEFAULT_REWARD_PARAMS): number {
  if (p.yieldfyHeld < params.minYieldfy) return 0;
  if (p.vaultUsd < params.minVaultUsd) return 0;
  return Math.pow(p.yieldfyHeld, params.alpha) * Math.pow(p.vaultUsd, params.beta);
}

/**
 * Size of the SOL pool distributed in this epoch.
 *
 * @param yieldfyMarketCapUsd  Rolling 7-day mean MC (anti-pump-and-snapshot).
 * @param solPriceUsd          SOL spot used to convert pool USD into SOL.
 */
export function epochSolPool(
  yieldfyMarketCapUsd: number,
  solPriceUsd: number,
  params: RewardParams = DEFAULT_REWARD_PARAMS,
): { usd: number; sol: number } {
  const usd = yieldfyMarketCapUsd * params.distributionRatePerEpoch;
  return { usd, sol: usd / solPriceUsd };
}

/**
 * Score every participant and produce a per-wallet reward breakdown.
 * Pure function — no I/O, no caching. Caller feeds in snapshots.
 */
export function distributeEpoch(
  participants: ParticipantInput[],
  yieldfyMarketCapUsd: number,
  solPriceUsd: number,
  params: RewardParams = DEFAULT_REWARD_PARAMS,
): { pool: { usd: number; sol: number }; scores: ParticipantScore[] } {
  const pool = epochSolPool(yieldfyMarketCapUsd, solPriceUsd, params);

  const raw = participants.map((p) => ({
    p,
    score: computeScore(p, params),
  }));
  const totalScore = raw.reduce((sum, r) => sum + r.score, 0);

  const scores: ParticipantScore[] = raw.map(({ p, score }) => {
    const eligible = score > 0;
    const share = totalScore > 0 ? score / totalScore : 0;
    const solReward = pool.sol * share;
    return {
      wallet: p.wallet,
      score,
      share,
      solReward,
      usdReward: solReward * solPriceUsd,
      eligible,
    };
  });

  return { pool, scores };
}
