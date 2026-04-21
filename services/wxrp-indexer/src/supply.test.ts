import { describe, it, expect } from "vitest";
import { diff, type SupplySnapshot } from "./supply.js";

function snap(supplyRaw: bigint, slot = 1, ts = 0): SupplySnapshot {
  return { supplyRaw, slot, decimals: 6, ts };
}

describe("supply diff", () => {
  it("positive delta on mint", () => {
    const d = diff(snap(100n), snap(150n, 2));
    expect(d.diffRaw).toBe(50n);
  });

  it("negative delta on burn", () => {
    const d = diff(snap(200n), snap(120n, 2));
    expect(d.diffRaw).toBe(-80n);
  });

  it("zero on no change", () => {
    const d = diff(snap(500n), snap(500n, 2));
    expect(d.diffRaw).toBe(0n);
  });
});
