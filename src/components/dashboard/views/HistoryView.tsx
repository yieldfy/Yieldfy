import { useState } from "react";
import { Download } from "lucide-react";
import { historyEntries } from "../mockData";

const RANGES = ["7d", "30d", "90d", "All"] as const;
const TYPES = ["All", "Deposits", "Withdrawals", "Rebalances", "Yield Claims"] as const;

const TYPE_MAP: Record<string, string> = {
  deposit: "Deposits", withdraw: "Withdrawals", rebalance: "Rebalances", yield: "Yield Claims",
};

const HistoryView = () => {
  const [range, setRange] = useState<typeof RANGES[number]>("30d");
  const [type, setType] = useState<typeof TYPES[number]>("All");
  const [openId, setOpenId] = useState<number | null>(null);

  const filtered = historyEntries.filter((e) => type === "All" || TYPE_MAP[e.type] === type);

  return (
    <div className="space-y-6">
      <div className="glass-card p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${range === r ? "gradient-bg text-white" : "bg-white/50 text-[#0F1923]/60 hover:text-[#0F1923]"}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="h-5 w-px bg-[#0F1923]/10 hidden sm:block" />
          <div className="flex gap-1 flex-wrap">
            {TYPES.map((t) => (
              <button key={t} onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${type === t ? "bg-[#0F1923] text-white" : "bg-white/50 text-[#0F1923]/60 hover:text-[#0F1923]"}`}>
                {t}
              </button>
            ))}
          </div>
          <button className="btn-secondary !py-1.5 !px-3 text-xs ml-auto inline-flex items-center gap-1.5">
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      <div className="glass-card p-4 md:p-6">
        <div className="space-y-1">
          {filtered.map((e) => (
            <div key={e.id}>
              <button
                onClick={() => setOpenId(openId === e.id ? null : e.id)}
                className="w-full grid grid-cols-[80px_24px_1fr_auto] md:grid-cols-[140px_24px_1fr_auto_auto] gap-3 md:gap-4 items-center text-left p-3 rounded-xl hover:bg-white/40 transition-colors"
              >
                <div className="text-xs text-[#0F1923]/50">{e.timestamp}</div>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
                <div className="min-w-0">
                  <div className="text-sm text-[#0F1923] truncate">{e.desc}</div>
                  <div className="text-[11px] text-[#0F1923]/50 mt-0.5 hidden md:block truncate">{e.reason}</div>
                </div>
                <div className="text-sm font-medium text-[#0F1923] hidden md:block">{e.amount}</div>
                <div className="font-instrument italic gradient-text text-base hidden md:block">{e.apy}</div>
              </button>
              {openId === e.id && (
                <div className="md:hidden px-3 pb-3 pl-[112px] text-[11px] text-[#0F1923]/60 space-y-1">
                  <div>{e.reason}</div>
                  <div className="text-[#0F1923]">{e.amount} · {e.apy}</div>
                  <a href="#" className="text-[#0F1923]/70 hover:text-[#0F1923]">View attestation →</a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
