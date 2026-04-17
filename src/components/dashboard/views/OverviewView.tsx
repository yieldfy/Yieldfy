import { useState } from "react";
import { ArrowUpRight, ArrowDownRight, CheckCircle2, Loader2 } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { overviewMetrics, yieldSeries, activePositions, recentActivity } from "../mockData";

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs uppercase tracking-wider text-[#0F1923]/40">{children}</div>
);

const RANGES = ["7D", "30D", "90D", "ALL"] as const;

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card !rounded-xl px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[#0F1923]/50">{label}</div>
      <div className="font-instrument italic text-lg gradient-text">{payload[0].value}%</div>
    </div>
  );
};

const OverviewView = () => {
  const [range, setRange] = useState<typeof RANGES[number]>("30D");
  const data = range === "7D" ? yieldSeries.slice(-7) : range === "90D" ? yieldSeries : yieldSeries;

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {overviewMetrics.map((m) => (
          <div key={m.label} className="glass-card glass-card-hover p-5">
            <Label>{m.label}</Label>
            <div className="mt-2 font-instrument italic gradient-text text-3xl md:text-4xl leading-none">{m.value}</div>
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              {m.up ? <ArrowUpRight size={12} className="text-[#2EC4B6]" /> : <ArrowDownRight size={12} className="text-[#E84855]" />}
              <span className={m.up ? "text-[#2EC4B6]" : "text-[#E84855]"}>{m.delta}</span>
              <span className="text-[#0F1923]/40">{m.deltaLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Positions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h3 className="font-barlow text-xl font-medium text-[#0F1923]">Yield Performance</h3>
            <div className="flex gap-1 self-start">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    range === r ? "gradient-bg text-white" : "text-[#0F1923]/50 hover:text-[#0F1923] hover:bg-white/40"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[260px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2EC4B6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2EC4B6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(15,25,35,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "rgba(15,25,35,0.4)", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "rgba(15,25,35,0.4)", fontSize: 10 }} tickLine={false} axisLine={false} domain={[6, 18]} unit="%" width={36} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(46,196,182,0.3)", strokeWidth: 1 }} />
                <Area type="monotone" dataKey="yield" stroke="#2EC4B6" strokeWidth={2} fill="url(#yieldGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#0F1923]/60">
            <span>Avg APY: <span className="text-[#0F1923] font-medium">11.8%</span></span>
            <span>Peak: <span className="text-[#0F1923] font-medium">16.2%</span></span>
            <span>Current venue: <span className="text-[#0F1923] font-medium">Kamino</span></span>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-barlow text-xl font-medium text-[#0F1923] mb-5">Active Positions</h3>
          <div className="space-y-4">
            {activePositions.map((p, i) => (
              <div key={i} className="rounded-xl bg-white/40 p-4 border border-white/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full" style={{ background: p.color }} />
                    <span className="font-medium text-sm text-[#0F1923]">{p.asset}</span>
                  </div>
                  <span className="font-instrument italic gradient-text text-lg">{p.apy}</span>
                </div>
                <div className="text-xs text-[#0F1923]/60 mb-2">{p.amount}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#0F1923]/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2EC4B6]" />
                  {p.time} in {p.venue}
                </div>
              </div>
            ))}
          </div>
          <button className="btn-secondary w-full mt-4 !py-2 text-xs">View All Positions →</button>
        </div>
      </div>

      {/* Recent activity */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-barlow text-xl font-medium text-[#0F1923]">Recent Activity</h3>
          <button className="text-xs text-[#0F1923]/60 hover:text-[#0F1923] transition-colors">View All →</button>
        </div>
        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="grid grid-cols-6 gap-4 px-3 pb-3 text-xs uppercase tracking-wider text-[#0F1923]/40 border-b border-[#0F1923]/10">
            <div>Date</div><div>Action</div><div>Asset</div><div>Amount</div><div>Venue</div><div>Status</div>
          </div>
          {recentActivity.map((r, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 px-3 py-3.5 text-sm text-[#0F1923]/80 border-b border-[#0F1923]/5 last:border-0">
              <div className="text-[#0F1923]/50">{r.date}</div>
              <div>{r.action}</div>
              <div>{r.asset}</div>
              <div className="font-medium">{r.amount}</div>
              <div className="text-[#0F1923]/60 truncate">{r.venue}</div>
              <div className="flex items-center gap-1.5 text-[#2EC4B6]">
                <CheckCircle2 size={14} /> {r.status}
              </div>
            </div>
          ))}
        </div>
        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {recentActivity.map((r, i) => (
            <div key={i} className="rounded-xl bg-white/40 p-4 border border-white/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#0F1923]/50">{r.date}</span>
                <span className="flex items-center gap-1 text-xs text-[#2EC4B6]"><CheckCircle2 size={12} />{r.status}</span>
              </div>
              <div className="text-sm font-medium text-[#0F1923]">{r.action} · {r.asset}</div>
              <div className="text-xs text-[#0F1923]/60 mt-1">{r.amount} · {r.venue}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OverviewView;
