/**
 * MC + price oracle. Fetches $YIELDFY and SOL prices from Jupiter, computes
 * market cap as price × supply, and maintains a rolling mean across recent
 * samples to dampen short-lived spikes.
 */

const JUPITER_PRICE_URL = "https://price.jup.ag/v6/price";

type JupiterPriceResponse = {
  data: Record<string, { id: string; mintSymbol: string; vsToken: string; vsTokenSymbol: string; price: number }>;
};

export async function fetchUsdPrice(mint: string): Promise<number> {
  const url = `${JUPITER_PRICE_URL}?ids=${encodeURIComponent(mint)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    throw new Error(`Jupiter price ${res.status} for ${mint}`);
  }
  const body = (await res.json()) as JupiterPriceResponse;
  const entry = body.data[mint];
  if (!entry || typeof entry.price !== "number") {
    throw new Error(`Jupiter has no price for ${mint}`);
  }
  return entry.price;
}

export interface RollingMean {
  push(sample: number): void;
  mean(): number;
  size(): number;
}

/** Simple ring buffer that exposes the running mean. Stable for our scale. */
export function rollingMean(capacity: number): RollingMean {
  const buf: number[] = [];
  return {
    push(s: number) {
      buf.push(s);
      while (buf.length > capacity) buf.shift();
    },
    mean() {
      if (buf.length === 0) return 0;
      return buf.reduce((a, b) => a + b, 0) / buf.length;
    },
    size() {
      return buf.length;
    },
  };
}

export interface MarketSnapshot {
  yieldfyPriceUsd: number;
  yieldfyMarketCapUsd: number;
  solPriceUsd: number;
  wxrpPriceUsd: number;
  fetchedAt: number;
}

/**
 * Sample current prices and compute MC. Returns null if any required price
 * fetch fails so the caller can skip the epoch (and we don't publish bad
 * distributions). For pre-launch, pass null `yieldfyMint` to skip the YIELDFY
 * lookup entirely.
 */
export async function sampleMarket(args: {
  yieldfyMint: string | null;
  yieldfySupply: number;
  wxrpMint: string;
}): Promise<MarketSnapshot | null> {
  const SOL_MINT = "So11111111111111111111111111111111111111112";
  try {
    const [solPriceUsd, wxrpPriceUsd, yieldfyPriceUsd] = await Promise.all([
      fetchUsdPrice(SOL_MINT),
      fetchUsdPrice(args.wxrpMint),
      args.yieldfyMint ? fetchUsdPrice(args.yieldfyMint) : Promise.resolve(0),
    ]);
    return {
      yieldfyPriceUsd,
      yieldfyMarketCapUsd: yieldfyPriceUsd * args.yieldfySupply,
      solPriceUsd,
      wxrpPriceUsd,
      fetchedAt: Date.now(),
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[oracle] sample failed: ${(err as Error).message}`);
    return null;
  }
}
