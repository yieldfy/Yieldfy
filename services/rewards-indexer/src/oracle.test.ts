import { describe, expect, it } from "vitest";
import { rollingMean } from "./oracle.js";

describe("rollingMean", () => {
  it("means an empty buffer to 0", () => {
    const m = rollingMean(5);
    expect(m.mean()).toBe(0);
    expect(m.size()).toBe(0);
  });

  it("computes a simple average", () => {
    const m = rollingMean(5);
    [10, 20, 30].forEach((s) => m.push(s));
    expect(m.mean()).toBeCloseTo(20, 6);
    expect(m.size()).toBe(3);
  });

  it("evicts oldest sample when capacity is exceeded", () => {
    const m = rollingMean(3);
    [1, 2, 3, 4, 5].forEach((s) => m.push(s));
    expect(m.size()).toBe(3);
    expect(m.mean()).toBeCloseTo(4, 6); // (3+4+5)/3
  });

  it("is stable under repeated samples of same value", () => {
    const m = rollingMean(7);
    for (let i = 0; i < 20; i += 1) m.push(42);
    expect(m.mean()).toBe(42);
  });
});
