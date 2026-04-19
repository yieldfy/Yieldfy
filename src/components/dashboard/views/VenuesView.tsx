import { useState } from "react";
import { ArrowUpDown, ChevronDown, Loader2 } from "lucide-react";
import { useVenueData, type VenueSnapshot } from "@/hooks/useVenueData";
import EmptyState from "../EmptyState";

type SortKey = keyof Pick<VenueSnapshot, "displayName" | "apy" | "tvlUsd" | "utilization">;

const fmtTvl = (n: number) => {
  if (!n) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtPct = (n: number, digits = 1) => (n ? `${n.toFixed(digits)}%` : "—");

const COLS: { key: SortKey; label: string }[] = [
  { key: "displayName", label: "Venue" },
  { key: "apy", label: "APY" },
  { key: "tvlUsd", label: "TVL" },
  { key: "utilization", label: "Util" },
];

const VenuesView = () => {
  const { data, isLoading, isError, error } = useVenueData();
  const [sortKey, setSortKey] = useState<SortKey>("apy");
  const [asc, setAsc] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (k: SortKey) =>
    sortKey === k ? setAsc(!asc) : (setSortKey(k), setAsc(false));

  if (isLoading) {
    return (
      <div className="glass-card p-10 flex items-center justify-center">
        <Loader2 size={18} className="animate-spin text-[#0F1923]/50" />
        <span className="ml-3 text-sm text-[#0F1923]/60">Loading venue data…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="Could not load venue data"
        description={
          error instanceof Error
            ? error.message
            : "DeFiLlama is unreachable. Try again shortly."
        }
      />
    );
  }

  const sorted = [...data].sort((a, b) => {
    const va = a[sortKey] as number | string;
    const vb = b[sortKey] as number | string;
    if (typeof va === "number") return asc ? (va as number) - (vb as number) : (vb as number) - (va as number);
    return asc
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va));
  });

  const allEmpty = data.every((v) => v.apy === 0 && v.tvlUsd === 0);

  return (
    <div className="space-y-6">
      {allEmpty && (
        <EmptyState
          title="No live wXRP markets yet"
          description="DeFiLlama hasn't indexed wXRP markets for these venues. Data will appear once pools go live."
        />
      )}

      <div className="glass-card p-4 md:p-6 hidden md:block">
        <h3 className="font-barlow text-xl font-medium text-[#0F1923] mb-5">
          Venue Scoring
        </h3>
        <div
          className="grid gap-2 px-3 pb-3 text-xs uppercase tracking-wider text-[#0F1923]/40 border-b border-[#0F1923]/10"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}
        >
          {COLS.map((c) => (
            <button
              key={c.key}
              onClick={() => toggle(c.key)}
              className="flex items-center gap-1 hover:text-[#0F1923] transition-colors text-left"
            >
              {c.label}{" "}
              <ArrowUpDown
                size={10}
                className={sortKey === c.key ? "text-[#2EC4B6]" : "opacity-40"}
              />
            </button>
          ))}
        </div>
        {sorted.map((v) => (
          <div
            key={v.venue}
            className="grid gap-2 items-center px-3 py-3.5 text-sm border-b border-[#0F1923]/5 last:border-0"
            style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}
          >
            <div className="font-medium text-[#0F1923]">{v.displayName}</div>
            <div className="font-instrument italic gradient-text text-base">
              {fmtPct(v.apy, 2)}
            </div>
            <div className="text-[#0F1923]/70">{fmtTvl(v.tvlUsd)}</div>
            <div className="text-[#0F1923]/70">{fmtPct(v.utilization * 100, 0)}</div>
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sorted.map((v) => (
          <div key={v.venue} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-[#0F1923]">{v.displayName}</span>
              <span className="font-instrument italic gradient-text text-xl">
                {fmtPct(v.apy, 2)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase text-[#0F1923]/40">TVL</div>
                <div className="text-[#0F1923]">{fmtTvl(v.tvlUsd)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[#0F1923]/40">Util</div>
                <div className="text-[#0F1923]">{fmtPct(v.utilization * 100, 0)}</div>
              </div>
            </div>
            <button
              onClick={() => setExpanded(expanded === v.venue ? null : v.venue)}
              className="mt-3 flex items-center gap-1 text-xs text-[#0F1923]/60 hover:text-[#0F1923]"
            >
              Details{" "}
              <ChevronDown
                size={12}
                className={`transition-transform ${
                  expanded === v.venue ? "rotate-180" : ""
                }`}
              />
            </button>
            {expanded === v.venue && (
              <div className="mt-3 text-xs text-[#0F1923]/60">
                Pool lookup: <span className="font-mono">{v.venue}-wxrp</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h3 className="font-barlow text-xl font-medium text-[#0F1923] mb-5">
          Optimizer Decision Log
        </h3>
        <EmptyState
          title="No decisions yet"
          description="The optimizer log will populate once the signer service begins attesting rebalances."
        />
      </div>
    </div>
  );
};

export default VenuesView;
