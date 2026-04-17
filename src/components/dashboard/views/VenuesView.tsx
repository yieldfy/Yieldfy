import { useState } from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { venues, decisionLog, type Venue } from "../mockData";

type SortKey = keyof Venue;

const ScoreRing = ({ score }: { score: number }) => {
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center h-9 w-9">
      <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
        <circle cx="18" cy="18" r={r} stroke="rgba(15,25,35,0.08)" strokeWidth="3" fill="none" />
        <circle cx="18" cy="18" r={r} stroke="url(#scoreGrad)" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3B82F6" /><stop offset="50%" stopColor="#2EC4B6" /><stop offset="100%" stopColor="#E84855" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-[10px] font-medium text-[#0F1923]">{score}</span>
    </div>
  );
};

const COLS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Venue" },
  { key: "strategy", label: "Strategy" },
  { key: "tvl", label: "TVL" },
  { key: "apy", label: "APY" },
  { key: "apy7d", label: "7d Avg" },
  { key: "utilization", label: "Util" },
  { key: "oracle", label: "Oracle" },
  { key: "audit", label: "Audit" },
  { key: "risk", label: "Risk" },
  { key: "score", label: "Score" },
];

const VenuesView = () => {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [asc, setAsc] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = [...venues].sort((a, b) => {
    const va = a[sortKey] as any, vb = b[sortKey] as any;
    if (typeof va === "number") return asc ? va - vb : vb - va;
    return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  const toggle = (k: SortKey) => sortKey === k ? setAsc(!asc) : (setSortKey(k), setAsc(false));

  return (
    <div className="space-y-6">
      <div className="glass-card p-4 md:p-6 hidden md:block">
        <h3 className="font-barlow text-xl font-medium text-[#0F1923] mb-5">Venue Scoring</h3>
        <div className="grid gap-2 px-3 pb-3 text-xs uppercase tracking-wider text-[#0F1923]/40 border-b border-[#0F1923]/10" style={{ gridTemplateColumns: "1.4fr 1fr 0.8fr 0.7fr 0.7fr 0.6fr 0.8fr 0.7fr 0.7fr 0.9fr" }}>
          {COLS.map((c) => (
            <button key={c.key} onClick={() => toggle(c.key)} className="flex items-center gap-1 hover:text-[#0F1923] transition-colors text-left">
              {c.label} <ArrowUpDown size={10} className={sortKey === c.key ? "text-[#2EC4B6]" : "opacity-40"} />
            </button>
          ))}
        </div>
        {sorted.map((v) => (
          <div
            key={v.name}
            className={`grid gap-2 items-center px-3 py-3.5 text-sm border-b border-[#0F1923]/5 last:border-0 ${v.active ? "border-l-2 border-l-[#2EC4B6] bg-[#2EC4B6]/5 -ml-3 pl-[10px]" : ""}`}
            style={{ gridTemplateColumns: "1.4fr 1fr 0.8fr 0.7fr 0.7fr 0.6fr 0.8fr 0.7fr 0.7fr 0.9fr" }}
          >
            <div className="font-medium text-[#0F1923] flex items-center gap-2">
              {v.name}
              {v.active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2EC4B6]/15 text-[#2EC4B6]">Active</span>}
            </div>
            <div className="text-[#0F1923]/70">{v.strategy}</div>
            <div className="text-[#0F1923]/70">{v.tvl}</div>
            <div className="font-instrument italic gradient-text text-base">{v.apy}%</div>
            <div className="text-[#0F1923]/70">{v.apy7d}%</div>
            <div className="text-[#0F1923]/70">{v.utilization}%</div>
            <div className="text-[#2EC4B6] text-xs">{v.oracle}</div>
            <div className="text-[#0F1923]/70">{v.audit}</div>
            <div className="text-[#0F1923]/70">{v.risk}</div>
            <div><ScoreRing score={v.score} /></div>
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sorted.map((v) => (
          <div key={v.name} className={`glass-card p-5 ${v.active ? "border-l-2 border-l-[#2EC4B6]" : ""}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#0F1923]">{v.name}</span>
                {v.active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2EC4B6]/15 text-[#2EC4B6]">Active</span>}
              </div>
              <ScoreRing score={v.score} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase text-[#0F1923]/40">TVL</div>
                <div className="text-[#0F1923]">{v.tvl}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[#0F1923]/40">APY</div>
                <div className="font-instrument italic gradient-text">{v.apy}%</div>
              </div>
            </div>
            <button onClick={() => setExpanded(expanded === v.name ? null : v.name)} className="mt-3 flex items-center gap-1 text-xs text-[#0F1923]/60 hover:text-[#0F1923]">
              Details <ChevronDown size={12} className={`transition-transform ${expanded === v.name ? "rotate-180" : ""}`} />
            </button>
            {expanded === v.name && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#0F1923]/70">
                <div>Strategy: <span className="text-[#0F1923]">{v.strategy}</span></div>
                <div>7d Avg: <span className="text-[#0F1923]">{v.apy7d}%</span></div>
                <div>Util: <span className="text-[#0F1923]">{v.utilization}%</span></div>
                <div>Oracle: <span className="text-[#2EC4B6]">{v.oracle}</span></div>
                <div>Audit: <span className="text-[#0F1923]">{v.audit}</span></div>
                <div>Risk: <span className="text-[#0F1923]">{v.risk}</span></div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h3 className="font-barlow text-xl font-medium text-[#0F1923] mb-5">Optimizer Decision Log</h3>
        <div className="space-y-3">
          {decisionLog.map((d, i) => (
            <div key={i} className="flex items-start gap-4 rounded-xl bg-white/40 p-4">
              <div className="text-xs text-[#0F1923]/50 w-20 shrink-0 mt-0.5">{d.time}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#0F1923]"><span className="font-medium">{d.winner}</span> selected</div>
                <div className="text-xs text-[#0F1923]/60 mt-0.5">{d.note}</div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${d.rebalanced ? "bg-[#2EC4B6]/15 text-[#2EC4B6]" : "bg-[#0F1923]/8 text-[#0F1923]/60"}`}>
                {d.rebalanced ? "Rebalanced" : "Held"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VenuesView;
