import type { VenueKey, VenueSnapshot } from "./score.js";

// DeFiLlama pool IDs — placeholders; swap once each venue publishes its wXRP market
const POOL: Record<VenueKey, string> = {
  kamino: "kamino-lend-wxrp",
  marginfi: "marginfi-wxrp",
  drift: "drift-wxrp",
  meteora: "meteora-wxrp",
};

// Static per-venue quality signals — refined over time / swapped for real data feeds.
// oracleAgeSec = age of most recent price push; auditScore = 0..1 quality rating.
const STATIC_META: Record<VenueKey, { oracleAgeSec: number; auditScore: number }> = {
  kamino: { oracleAgeSec: 10, auditScore: 0.92 },
  marginfi: { oracleAgeSec: 12, auditScore: 0.89 },
  drift: { oracleAgeSec: 15, auditScore: 0.86 },
  meteora: { oracleAgeSec: 18, auditScore: 0.80 },
};

type LlamaPool = {
  pool: string;
  apy?: number;
  tvlUsd?: number;
  utilization?: number;
};

export async function fetchSnapshots(): Promise<VenueSnapshot[]> {
  const r = await fetch("https://yields.llama.fi/pools");
  if (!r.ok) throw new Error(`DeFiLlama request failed: ${r.status}`);
  const { data } = (await r.json()) as { data: LlamaPool[] };

  return (Object.entries(POOL) as [VenueKey, string][]).map(([venue, poolId]) => {
    const p = data.find((x) => x.pool === poolId);
    const meta = STATIC_META[venue];
    return {
      venue,
      apy: p?.apy ?? 0,
      tvlUsd: p?.tvlUsd ?? 0,
      utilization: p?.utilization ?? 0,
      oracleAgeSec: meta.oracleAgeSec,
      auditScore: meta.auditScore,
    };
  });
}
