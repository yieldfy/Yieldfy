import { describe, it, expect } from "vitest";
import { chooseVenue, scoreVenue, type VenueSnapshot } from "./score.js";

const snap = (over: Partial<VenueSnapshot>): VenueSnapshot => ({
  venue: "kamino",
  apy: 10,
  tvlUsd: 100_000_000,
  utilization: 0.7,
  oracleAgeSec: 15,
  auditScore: 0.9,
  ...over,
});

describe("scoreVenue", () => {
  it("rewards higher APY on opportunistic profile", () => {
    const low = scoreVenue(snap({ apy: 5 }), "opportunistic");
    const high = scoreVenue(snap({ apy: 20 }), "opportunistic");
    expect(high).toBeGreaterThan(low);
  });

  it("penalises stale oracles", () => {
    const fresh = scoreVenue(snap({ oracleAgeSec: 5 }), "conservative");
    const stale = scoreVenue(snap({ oracleAgeSec: 200 }), "conservative");
    expect(fresh).toBeGreaterThan(stale);
  });
});

describe("chooseVenue", () => {
  it("picks the highest-scoring venue", () => {
    const snaps: VenueSnapshot[] = [
      snap({ venue: "kamino", apy: 8 }),
      snap({ venue: "marginfi", apy: 14 }),
      snap({ venue: "drift", apy: 11 }),
    ];
    const winner = chooseVenue(snaps, "balanced");
    expect(winner.s.venue).toBe("marginfi");
  });
});
