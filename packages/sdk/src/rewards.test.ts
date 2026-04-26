import { describe, expect, it } from "vitest";
import {
  DEFAULT_REWARD_PARAMS,
  computeScore,
  distributeEpoch,
  epochSolPool,
} from "./rewards.js";

describe("epochSolPool", () => {
  it("scales linearly with MC at the configured rate", () => {
    const pool = epochSolPool(200_000, 125, { ...DEFAULT_REWARD_PARAMS, distributionRatePerEpoch: 0.001 });
    expect(pool.usd).toBeCloseTo(200, 3);
    expect(pool.sol).toBeCloseTo(1.6, 3);
  });

  it("uses the conservative launch rate (0.0675% of MC) by default", () => {
    const pool = epochSolPool(200_000, 125);
    expect(pool.usd).toBeCloseTo(135, 3);
    expect(pool.sol).toBeCloseTo(1.08, 3);
  });

  it("respects rate parameter", () => {
    const aggressive = epochSolPool(200_000, 125, { ...DEFAULT_REWARD_PARAMS, distributionRatePerEpoch: 0.002 });
    const conservative = epochSolPool(200_000, 125, { ...DEFAULT_REWARD_PARAMS, distributionRatePerEpoch: 0.0005 });
    expect(aggressive.usd / conservative.usd).toBeCloseTo(4, 3);
  });
});

describe("computeScore", () => {
  it("returns 0 when $YIELDFY balance is below floor", () => {
    expect(computeScore({ wallet: "x", yieldfyHeld: 500, vaultUsd: 100 })).toBe(0);
  });

  it("returns 0 when vault USD is below floor", () => {
    expect(computeScore({ wallet: "x", yieldfyHeld: 1_000_000, vaultUsd: 0.01 })).toBe(0);
  });

  it("returns 0 when either side is exactly zero (dual-gate)", () => {
    expect(computeScore({ wallet: "x", yieldfyHeld: 0, vaultUsd: 1000 })).toBe(0);
    expect(computeScore({ wallet: "x", yieldfyHeld: 5_000_000, vaultUsd: 0 })).toBe(0);
  });

  it("applies sub-linear weighting under default α=0.6 β=0.4", () => {
    const small = computeScore({ wallet: "x", yieldfyHeld: 1_000_000, vaultUsd: 25 });
    const tenXTokens = computeScore({ wallet: "y", yieldfyHeld: 10_000_000, vaultUsd: 25 });
    // 10x token holding does NOT yield 10x score under sub-linear weighting.
    // 10^0.6 ≈ 3.98 — so the 10x holder gets ~4x the score, not 10x.
    expect(tenXTokens / small).toBeGreaterThan(3.5);
    expect(tenXTokens / small).toBeLessThan(4.5);
  });
});

describe("distributeEpoch", () => {
  it("sums shares to 1 (or 0 if no eligible participants)", () => {
    const { scores } = distributeEpoch(
      [
        { wallet: "a", yieldfyHeld: 3_600_000, vaultUsd: 25 },
        { wallet: "b", yieldfyHeld: 500_000, vaultUsd: 10 },
        { wallet: "c", yieldfyHeld: 100, vaultUsd: 50 }, // ineligible — below YIELDFY floor
      ],
      83_000,
      125,
    );
    const total = scores.reduce((s, x) => s + x.share, 0);
    expect(total).toBeCloseTo(1, 6);
    expect(scores.find((s) => s.wallet === "c")?.share).toBe(0);
  });

  it("zero participants → zero pool distribution but pool is sized correctly", () => {
    const result = distributeEpoch([], 100_000, 125);
    expect(result.pool.usd).toBeCloseTo(67.5, 3); // 100k × 0.000675
    expect(result.scores).toEqual([]);
  });

  it("calculates user's prescribed scenario: $300 YIELDFY (3.6M tokens, ~$83k MC) + $25 vault, 5 users", () => {
    // User's question. We model the dominant user against 4 smaller ones.
    const others = Array.from({ length: 4 }, (_, i) => ({
      wallet: `other-${i}`,
      yieldfyHeld: 500_000, // ~$42 worth at $83k MC (much smaller bag)
      vaultUsd: 10,
    }));
    const result = distributeEpoch(
      [{ wallet: "user", yieldfyHeld: 3_600_000, vaultUsd: 25 }, ...others],
      83_000,
      125,
    );
    const user = result.scores.find((s) => s.wallet === "user")!;
    // User dominates: ~50%+ share of the pool given their position
    expect(user.share).toBeGreaterThan(0.4);
    expect(user.share).toBeLessThan(0.7);
    // At launch rate 0.0675% / $125 SOL: pool ≈ 0.45 SOL/wk → user gets ~0.243 SOL
    expect(user.solReward).toBeGreaterThan(0.20);
    expect(user.solReward).toBeLessThan(0.30);
  });
});
