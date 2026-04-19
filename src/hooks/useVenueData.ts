import { useQuery } from "@tanstack/react-query";

export type VenueKey = "kamino" | "marginfi" | "drift" | "meteora";

export type VenueSnapshot = {
  venue: VenueKey;
  displayName: string;
  apy: number;
  tvlUsd: number;
  utilization: number;
};

// DeFiLlama pool IDs — placeholders; swap once each venue publishes its wXRP market
const POOL: Record<VenueKey, { id: string; displayName: string }> = {
  kamino: { id: "kamino-lend-wxrp", displayName: "Kamino" },
  marginfi: { id: "marginfi-wxrp", displayName: "MarginFi" },
  drift: { id: "drift-wxrp", displayName: "Drift" },
  meteora: { id: "meteora-wxrp", displayName: "Meteora" },
};

export function useVenueData() {
  return useQuery({
    queryKey: ["venues"],
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async (): Promise<VenueSnapshot[]> => {
      const r = await fetch("https://yields.llama.fi/pools");
      if (!r.ok) throw new Error(`DeFiLlama request failed: ${r.status}`);
      const { data } = (await r.json()) as { data: Array<Record<string, unknown>> };
      return (Object.entries(POOL) as [VenueKey, (typeof POOL)[VenueKey]][]).map(
        ([venue, meta]) => {
          const p = data.find((x) => x.pool === meta.id) as
            | { apy?: number; tvlUsd?: number; utilization?: number }
            | undefined;
          return {
            venue,
            displayName: meta.displayName,
            apy: p?.apy ?? 0,
            tvlUsd: p?.tvlUsd ?? 0,
            utilization: p?.utilization ?? 0,
          };
        },
      );
    },
  });
}
