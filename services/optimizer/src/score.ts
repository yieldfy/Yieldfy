export type VenueKey = "kamino" | "marginfi" | "drift" | "meteora";

export type VenueSnapshot = {
  venue: VenueKey;
  apy: number;
  tvlUsd: number;
  utilization: number;
  oracleAgeSec: number;
  auditScore: number;
};

export type RiskProfile = "conservative" | "balanced" | "opportunistic";

export const WEIGHTS: Record<RiskProfile, Record<string, number>> = {
  conservative: { apy: 0.35, tvl: 0.25, util: 0.15, oracle: 0.10, audit: 0.15 },
  balanced: { apy: 0.50, tvl: 0.20, util: 0.10, oracle: 0.10, audit: 0.10 },
  opportunistic: { apy: 0.70, tvl: 0.10, util: 0.05, oracle: 0.05, audit: 0.10 },
};

const norm = (x: number, max: number) => Math.max(0, Math.min(1, x / max));

export function scoreVenue(v: VenueSnapshot, profile: RiskProfile): number {
  const w = WEIGHTS[profile];
  return (
    w.apy * norm(v.apy, 30) +
    w.tvl * norm(v.tvlUsd, 500_000_000) +
    w.util * (1 - Math.abs(v.utilization - 0.75)) +
    w.oracle * Math.max(0, 1 - v.oracleAgeSec / 120) +
    w.audit * v.auditScore
  );
}

export function chooseVenue(snaps: VenueSnapshot[], profile: RiskProfile) {
  return snaps
    .map((s) => ({ s, score: scoreVenue(s, profile) }))
    .sort((a, b) => b.score - a.score)[0];
}

export const VENUE_CODE: Record<VenueKey, number> = {
  kamino: 0,
  marginfi: 1,
  drift: 2,
  meteora: 3,
};
