import { useState } from "react";
import { X } from "lucide-react";
import { activePositions } from "../mockData";

const PositionsView = () => {
  const [withdraw, setWithdraw] = useState<null | typeof activePositions[number]>(null);
  const [withdrawAmt, setWithdrawAmt] = useState("");

  return (
    <div className="space-y-6">
      <div className="glass-card p-5 md:p-6">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Total Value" value="$2,450,000" />
          <Stat label="Weighted Avg APY" value="11.8%" gradient />
          <Stat label="Total Yield Earned" value="$24,312" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activePositions.map((p, i) => (
          <div key={i} className="glass-card glass-card-hover p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full" style={{ background: p.color }} />
                <div>
                  <div className="font-medium text-[#0F1923]">{p.asset}</div>
                  <div className="text-xs text-[#0F1923]/60">{p.amount}</div>
                </div>
              </div>
              <div className="glass-pill"><div className="glass-pill-inner !text-[10px]">{p.amount.replace("$", "").replace(",000", "K")} y{p.asset.slice(0, 3)}</div></div>
            </div>
            <div className="flex items-center justify-between mb-4 rounded-xl bg-white/40 px-4 py-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#0F1923]/40">Current Venue</div>
                <div className="text-sm text-[#0F1923] font-medium mt-0.5">{p.venue}</div>
                <div className="text-[11px] text-[#0F1923]/50 mt-0.5">{p.time} in venue</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-[#0F1923]/40">APY</div>
                <div className="font-instrument italic gradient-text text-2xl mt-0.5">{p.apy}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => { setWithdraw(p); setWithdrawAmt(p.amount); }} className="btn-secondary flex-1 !py-2 text-xs">Withdraw</button>
              <a href="#" className="text-xs text-[#0F1923]/60 hover:text-[#0F1923] transition-colors">View on Solscan →</a>
            </div>
          </div>
        ))}
      </div>

      {withdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1923]/40 backdrop-blur-sm">
          <div className="glass-card p-6 md:p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-barlow text-xl font-medium text-[#0F1923]">Withdraw {withdraw.asset}</h3>
              <button onClick={() => setWithdraw(null)} className="text-[#0F1923]/50 hover:text-[#0F1923]"><X size={18} /></button>
            </div>
            <input
              value={withdrawAmt}
              onChange={(e) => setWithdrawAmt(e.target.value)}
              className="w-full bg-transparent text-center font-instrument italic text-4xl gradient-text outline-none mb-2"
            />
            <div className="text-xs text-[#0F1923]/50 text-center mb-6">Available: {withdraw.amount}</div>

            <div className="rounded-xl bg-white/50 p-4 mb-4 text-sm">
              <div className="flex justify-between mb-2"><span className="text-[#0F1923]/60">Destination</span><span className="font-mono text-xs text-[#0F1923]">rXRP...9d2B</span></div>
              <div className="flex justify-between"><span className="text-[#0F1923]/60">Settlement</span><span className="text-[#0F1923]">&lt;90 seconds</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setWithdraw(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => setWithdraw(null)} className="btn-primary flex-1">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, gradient }: { label: string; value: string; gradient?: boolean }) => (
  <div>
    <div className="text-xs uppercase tracking-wider text-[#0F1923]/40">{label}</div>
    <div className={`mt-1 font-instrument italic text-2xl md:text-3xl ${gradient ? "gradient-text" : "text-[#0F1923]"}`}>{value}</div>
  </div>
);

export default PositionsView;
