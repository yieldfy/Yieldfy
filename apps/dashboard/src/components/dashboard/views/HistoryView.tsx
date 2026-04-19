import { useState } from "react";
import { Download } from "lucide-react";
import EmptyState from "../EmptyState";

const RANGES = ["7d", "30d", "90d", "All"] as const;
const TYPES = ["All", "Deposits", "Withdrawals", "Rebalances", "Yield Claims"] as const;

const HistoryView = () => {
  const [range, setRange] = useState<typeof RANGES[number]>("30d");
  const [type, setType] = useState<typeof TYPES[number]>("All");

  return (
    <div className="space-y-6">
      <div className="glass-card p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  range === r
                    ? "gradient-bg text-white"
                    : "bg-white/50 text-[#0F1923]/60 hover:text-[#0F1923]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="h-5 w-px bg-[#0F1923]/10 hidden sm:block" />
          <div className="flex gap-1 flex-wrap">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  type === t
                    ? "bg-[#0F1923] text-white"
                    : "bg-white/50 text-[#0F1923]/60 hover:text-[#0F1923]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            disabled
            className="btn-secondary !py-1.5 !px-3 text-xs ml-auto inline-flex items-center gap-1.5 opacity-60 cursor-not-allowed"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      <div className="glass-card p-4 md:p-6">
        <EmptyState
          title="No activity yet"
          description="Once deposits, rebalances, and yield claims land on-chain, they'll stream in here."
        />
      </div>
    </div>
  );
};

export default HistoryView;
