import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ChevronDown, ChevronUp } from "lucide-react";

const ASSETS = [
  { symbol: "OUSG", issuer: "Ondo Finance", balance: "2,500,000" },
  { symbol: "USDY", issuer: "Ondo Finance", balance: "1,800,000" },
];

const RISKS = [
  { key: "Conservative", desc: "Top-tier audited venues only" },
  { key: "Balanced", desc: "Audited venues, dynamic rebalance" },
  { key: "Opportunistic", desc: "Higher APY, broader venue set" },
];

const STAGES = [
  { label: "Locking on XRPL", est: "~4s" },
  { label: "Bridging via Wormhole", est: "~13s" },
  { label: "Optimizer scoring venues", est: "~5s" },
  { label: "Depositing into Kamino", est: "~2s" },
];

const DepositView = () => {
  const [step, setStep] = useState(1);
  const [asset, setAsset] = useState(ASSETS[0]);
  const [amount, setAmount] = useState("1,500,000");
  const [risk, setRisk] = useState("Balanced");
  const [expanded, setExpanded] = useState(false);
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (step !== 4) return;
    setStage(0); setDone(false);
    const timers: number[] = [];
    STAGES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStage(i + 1), (i + 1) * 1500));
    });
    timers.push(window.setTimeout(() => setDone(true), STAGES.length * 1500 + 400));
    return () => timers.forEach(clearTimeout);
  }, [step]);

  return (
    <div className="max-w-lg mx-auto">
      <div className="glass-card p-6 md:p-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`h-1 flex-1 rounded-full transition-all ${n <= step ? "gradient-bg" : "bg-[#0F1923]/10"}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 className="font-barlow text-2xl font-medium text-[#0F1923] mb-1">Select Asset</h2>
            <p className="text-sm text-[#0F1923]/60 mb-6">Choose the RWA asset to deposit from your XRPL wallet.</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {ASSETS.map((a) => {
                const selected = a.symbol === asset.symbol;
                const inner = (
                  <button
                    onClick={() => setAsset(a)}
                    className={`w-full text-left rounded-2xl p-4 transition-all bg-white/60 ${selected ? "" : "hover:bg-white/80"}`}
                  >
                    <div className="font-instrument italic text-2xl gradient-text">{a.symbol}</div>
                    <div className="text-xs text-[#0F1923]/60 mt-1">{a.issuer}</div>
                    <div className="text-[11px] text-[#0F1923]/50 mt-3">Balance: {a.balance}</div>
                  </button>
                );
                return selected ? (
                  <div key={a.symbol} className="glass-refraction"><div className="glass-refraction-inner">{inner}</div></div>
                ) : <div key={a.symbol}>{inner}</div>;
              })}
            </div>
            <button onClick={() => setStep(2)} className="btn-primary w-full">Next</button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-barlow text-2xl font-medium text-[#0F1923] mb-6">Enter Amount</h2>
            <div className="text-center mb-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-center font-instrument italic text-5xl gradient-text outline-none"
              />
            </div>
            <div className="flex items-center justify-center gap-3 mb-6 text-xs text-[#0F1923]/60">
              <span>Available: {asset.balance} {asset.symbol}</span>
              <button onClick={() => setAmount(asset.balance)} className="px-2 py-0.5 rounded-full bg-white/60 hover:bg-white/90 text-[#0F1923] font-medium transition-colors">MAX</button>
            </div>

            <div className="text-xs uppercase tracking-wider text-[#0F1923]/40 mb-3">Risk Profile</div>
            <div className="space-y-2 mb-6">
              {RISKS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRisk(r.key)}
                  className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all ${
                    risk === r.key ? "gradient-bg text-white" : "bg-white/50 hover:bg-white/80 text-[#0F1923]"
                  }`}
                >
                  <span className="font-medium text-sm">{r.key}</span>
                  <span className={`text-xs ${risk === r.key ? "text-white/85" : "text-[#0F1923]/55"}`}>{r.desc}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
              <button onClick={() => setStep(3)} className="btn-primary flex-1">Next</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-barlow text-2xl font-medium text-[#0F1923] mb-6">Review & Confirm</h2>
            <div className="rounded-2xl bg-white/50 p-5 mb-4 space-y-3 text-sm">
              <Row label="Asset" value={asset.symbol} />
              <Row label="Amount" value={amount} />
              <Row label="Risk Profile" value={risk} />
              <Row label="Estimated APY" value="8.2% – 14.6%" gradient />
              <Row label="Estimated Venue" value="Kamino (highest score)" />
              <Row label="Fee" value="25 bps on routed flow" />
            </div>
            <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between text-xs text-[#0F1923]/60 hover:text-[#0F1923] py-3 transition-colors">
              <span>What happens next?</span>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expanded && (
              <ol className="text-xs text-[#0F1923]/70 space-y-1.5 mb-4 pl-4 list-decimal">
                <li>Lock your asset on XRPL via the Yieldfy gateway.</li>
                <li>Bridge via Wormhole NTT to Solana.</li>
                <li>Optimizer scores all venues in real time.</li>
                <li>Deposit into the highest-scoring venue, mint receipt token.</li>
              </ol>
            )}
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
              <button onClick={() => setStep(4)} className="btn-primary flex-1">Confirm Deposit</button>
            </div>
          </>
        )}

        {step === 4 && !done && (
          <>
            <h2 className="font-barlow text-2xl font-medium text-[#0F1923] mb-6">Processing</h2>
            <div className="space-y-3">
              {STAGES.map((s, i) => {
                const active = i === stage;
                const complete = i < stage;
                return (
                  <div key={s.label} className="flex items-center gap-3 rounded-xl bg-white/50 px-4 py-3">
                    <div className="h-7 w-7 flex items-center justify-center rounded-full">
                      {complete ? <CheckCircle2 size={20} className="text-[#2EC4B6]" /> :
                        active ? <Loader2 size={18} className="animate-spin text-[#0F1923]/70" /> :
                        <div className="h-3 w-3 rounded-full bg-[#0F1923]/15" />}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm ${complete || active ? "text-[#0F1923]" : "text-[#0F1923]/40"}`}>{s.label}</div>
                    </div>
                    <div className="text-xs text-[#0F1923]/50">{s.est}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {step === 4 && done && (
          <div className="text-center py-6">
            <div className="mx-auto h-20 w-20 rounded-full gradient-bg flex items-center justify-center mb-5">
              <CheckCircle2 size={44} className="text-white" strokeWidth={2} />
            </div>
            <h2 className="font-barlow text-2xl font-medium text-[#0F1923]">Deposit Complete</h2>
            <p className="text-sm text-[#0F1923]/60 mt-2 mb-5">Received: <span className="font-medium text-[#0F1923]">{amount} y{asset.symbol.slice(0, 3)}</span></p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">New Deposit</button>
              <button className="btn-primary flex-1">View Position →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value, gradient }: { label: string; value: string; gradient?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs uppercase tracking-wider text-[#0F1923]/40">{label}</span>
    <span className={gradient ? "font-instrument italic gradient-text text-lg" : "text-[#0F1923] font-medium"}>{value}</span>
  </div>
);

export default DepositView;
