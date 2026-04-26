import { describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";
import { buildParticipants, type PositionRow } from "./snapshot.js";

describe("buildParticipants — joining holdings + positions", () => {
  const a = Keypair.generate().publicKey.toBase58();
  const b = Keypair.generate().publicKey.toBase58();
  const c = Keypair.generate().publicKey.toBase58();

  it("emits one row per unique wallet across both sets", () => {
    const holdings = new Map<string, number>([
      [a, 1_000_000],
      [b, 500_000],
    ]);
    const positions: PositionRow[] = [
      { owner: b, principalWxrp: 10 },
      { owner: c, principalWxrp: 5 },
    ];
    const result = buildParticipants(holdings, positions, 2.0);

    const wallets = new Set(result.map((r) => r.wallet));
    expect(wallets.size).toBe(3);
    expect(wallets.has(a)).toBe(true);
    expect(wallets.has(b)).toBe(true);
    expect(wallets.has(c)).toBe(true);
  });

  it("multiplies vault wXRP by spot price", () => {
    const positions: PositionRow[] = [{ owner: a, principalWxrp: 12.5 }];
    const result = buildParticipants(new Map(), positions, 1.85);
    expect(result.find((r) => r.wallet === a)?.vaultUsd).toBeCloseTo(23.125, 6);
  });

  it("sums multiple position rows for the same owner", () => {
    const positions: PositionRow[] = [
      { owner: a, principalWxrp: 10 },
      { owner: a, principalWxrp: 5 }, // shouldn't happen at one PDA per user, but defend
    ];
    const result = buildParticipants(new Map(), positions, 2);
    expect(result.find((r) => r.wallet === a)?.vaultUsd).toBeCloseTo(30, 6);
  });

  it("reports 0 vault when wallet only holds tokens (still emitted, scoring will gate)", () => {
    const holdings = new Map<string, number>([[a, 1_000_000]]);
    const result = buildParticipants(holdings, [], 1);
    const row = result.find((r) => r.wallet === a)!;
    expect(row.vaultUsd).toBe(0);
    expect(row.yieldfyHeld).toBe(1_000_000);
  });

  it("reports 0 yieldfy when wallet only has vault position", () => {
    const positions: PositionRow[] = [{ owner: a, principalWxrp: 5 }];
    const result = buildParticipants(new Map(), positions, 2);
    const row = result.find((r) => r.wallet === a)!;
    expect(row.yieldfyHeld).toBe(0);
    expect(row.vaultUsd).toBeCloseTo(10, 6);
  });
});
