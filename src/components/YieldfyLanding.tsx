import { useState } from "react";

function CornerFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute -top-[3.5px] -left-[3.5px] w-[7px] h-[7px] corner-accent z-10" />
      <span className="absolute -top-[3.5px] -right-[3.5px] w-[7px] h-[7px] corner-accent z-10" />
      <span className="absolute -bottom-[3.5px] -left-[3.5px] w-[7px] h-[7px] corner-accent z-10" />
      <span className="absolute -bottom-[3.5px] -right-[3.5px] w-[7px] h-[7px] corner-accent z-10" />
      {children}
    </div>
  );
}

function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs tracking-[0.2em] uppercase text-white/50 mb-6">
      <span className="font-mono gradient-text">{number}</span>
      <span className="w-8 h-px bg-white/20" />
      <span>{label}</span>
    </div>
  );
}

function Blobs({ variant = "subtle" }: { variant?: "subtle" | "medium" }) {
  const op1 = variant === "medium" ? 0.1 : 0.07;
  const op2 = variant === "medium" ? 0.08 : 0.06;
  return (
    <>
      <div className="blob absolute -left-[200px] top-[10%] h-[600px] w-[600px]" style={{ opacity: op1 }} />
      <div className="blob absolute -right-[150px] bottom-[10%] h-[700px] w-[700px]" style={{ opacity: op2, animationDirection: "reverse" }} />
    </>
  );
}

function GradientDot({ className = "" }: { className?: string }) {
  return <span className={`w-[7px] h-[7px] corner-accent shrink-0 ${className}`} />;
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Deposit on XRPL", copy: "Hold OUSG, TBILL, or other tokenized treasuries in your XRPL account. Yieldfy reads the position through a non-custodial routing contract." },
    { n: "02", title: "Bridge atomically", copy: "RWA tokens are wrapped into a Solana-native representation through an audited bridge, preserving institutional custody and compliance metadata." },
    { n: "03", title: "Agent routes to best yield", copy: "An autonomous agent evaluates every major Solana yield venue against risk, depth, and net APY — then allocates capital where it earns most." },
    { n: "04", title: "Settle back to XRPL", copy: "Principal and accrued yield unwind back to XRPL on demand, with a full on-chain audit trail across both ledgers." },
  ];
  return (
    <section className="relative py-32 px-8 overflow-hidden bg-[#0F1923]">
      <Blobs variant="medium" />
      <div className="relative max-w-6xl mx-auto">
        <SectionLabel number="01" label="How It Works" />
        <h2 className="text-[52px] leading-[1.05] font-light tracking-tight mb-4 max-w-3xl text-white">
          From tokenized treasuries to{" "}
          <span className="font-instrument italic font-normal gradient-text">Solana-native yield</span>, in four steps.
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mb-20">
          Yieldfy removes the engineering overhead institutions face when accessing Solana DeFi from an XRPL treasury position.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="glass-card glass-card-hover p-10 group">
              <div className="flex items-start justify-between mb-8">
                <span className="font-mono text-xs gradient-text">{s.n}</span>
                <GradientDot />
              </div>
              <h3 className="text-2xl font-light mb-4 text-white">{s.title}</h3>
              <p className="text-white/70 leading-relaxed">{s.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metrics() {
  const stats = [
    { k: "$2.4B", v: "Tokenized treasuries on XRPL" },
    { k: "14.2%", v: "Best-in-class Solana yield (30d avg)" },
    { k: "<9s", v: "Average cross-chain settlement" },
    { k: "24/7", v: "Autonomous agent rebalancing" },
  ];
  return (
    <section className="relative py-20 px-8 overflow-hidden bg-[#0a1219]">
      <Blobs />
      <div className="relative max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.k} className="glass-card glass-card-hover p-8 text-center">
              <div className="text-4xl md:text-5xl font-instrument italic font-normal mb-3 gradient-text metric-glow">{s.k}</div>
              <div className="text-xs tracking-wider uppercase text-white/60">{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArchDiagram() {
  return (
    <svg viewBox="0 0 500 320" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gAcc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2EC4B6" />
          <stop offset="100%" stopColor="#E84855" />
        </linearGradient>
      </defs>
      <g>
        <rect x="20" y="40" width="140" height="80" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="1" rx="4" />
        <text x="90" y="72" textAnchor="middle" fill="white" fontSize="11" fontFamily="Barlow" letterSpacing="1.5">XRPL</text>
        <text x="90" y="92" textAnchor="middle" fill="white" fillOpacity="0.6" fontSize="9" fontFamily="Barlow">OUSG · TBILL</text>
      </g>
      <g>
        <rect x="200" y="120" width="100" height="80" fill="url(#gAcc)" rx="4" />
        <text x="250" y="152" textAnchor="middle" fill="#0F1923" fontSize="11" fontFamily="Barlow" fontWeight="600" letterSpacing="1.5">YIELDFY</text>
        <text x="250" y="172" textAnchor="middle" fill="#0F1923" fontSize="9" fontFamily="Barlow">routing agent</text>
      </g>
      <g>
        {["Kamino", "Jito", "MarginFi", "Drift"].map((name, i) => (
          <g key={name}>
            <rect x={340} y={20 + i * 70} width="140" height="50" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="1" rx="4" />
            <text x={410} y={42 + i * 70} textAnchor="middle" fill="white" fontSize="10" fontFamily="Barlow" letterSpacing="1">{name.toUpperCase()}</text>
            <text x={410} y={58 + i * 70} textAnchor="middle" fill="white" fillOpacity="0.5" fontSize="8" fontFamily="Barlow">Solana</text>
          </g>
        ))}
      </g>
      <g stroke="url(#gAcc)" strokeOpacity="0.6" strokeWidth="1" fill="none">
        <line x1="160" y1="80" x2="200" y2="150" />
        <line x1="160" y1="80" x2="200" y2="170" />
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="300" y1="160" x2="340" y2={45 + i * 70} />
        ))}
      </g>
    </svg>
  );
}

function Architecture() {
  return (
    <section className="relative py-32 px-8 overflow-hidden bg-[#0F1923]">
      <Blobs />
      <div className="relative max-w-6xl mx-auto">
        <SectionLabel number="02" label="Architecture" />
        <div className="grid md:grid-cols-5 gap-12 items-start">
          <div className="md:col-span-2">
            <h2 className="text-[44px] leading-[1.1] font-light mb-6 text-white">
              Two ledgers.{" "}
              <span className="font-instrument italic font-normal gradient-text">One routing layer.</span>
            </h2>
            <p className="text-white/70 leading-relaxed mb-8">
              Yieldfy maintains custody parity across XRPL and Solana through cryptographic proofs. Your treasuries never leave the regulated rails institutions require — they gain yield from them.
            </p>
            <ul className="space-y-3 text-white/80 text-sm">
              {["Non-custodial routing contracts on both chains", "Proof-of-reserve attestation every epoch", "Signed messages preserve compliance metadata"].map((item) => (
                <li key={item} className="flex gap-3">
                  <GradientDot className="mt-[7px]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-3">
            <div className="glass-refraction">
              <div className="glass-refraction-inner p-10">
                <ArchDiagram />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    Low: { bg: "rgba(46,196,182,0.1)", color: "#2EC4B6" },
    Medium: { bg: "rgba(255,107,53,0.1)", color: "#FF6B35" },
    High: { bg: "rgba(232,72,85,0.1)", color: "#E84855" },
  };
  const s = styles[risk];
  return (
    <span
      className="inline-block px-2.5 py-1 text-xs font-medium rounded-md"
      style={{ background: s.bg, color: s.color }}
    >
      {risk}
    </span>
  );
}

function Venues() {
  const [sortBy, setSortBy] = useState("apy");
  const venues = [
    { name: "Kamino", type: "Lending", tvl: "$1.2B", apy: 14.2, risk: "Low" },
    { name: "Jito", type: "LST Restaking", tvl: "$3.4B", apy: 11.8, risk: "Low" },
    { name: "MarginFi", type: "Lending", tvl: "$640M", apy: 10.4, risk: "Medium" },
    { name: "Drift", type: "Perp Vaults", tvl: "$210M", apy: 16.9, risk: "Medium" },
    { name: "Meteora", type: "DLMM LP", tvl: "$480M", apy: 22.1, risk: "High" },
    { name: "Orca", type: "Whirlpool LP", tvl: "$390M", apy: 8.7, risk: "Low" },
  ];
  const sorted = [...venues].sort((a, b) => {
    if (sortBy === "apy") return b.apy - a.apy;
    if (sortBy === "tvl") return parseFloat(b.tvl.replace(/[$BM]/g, "")) - parseFloat(a.tvl.replace(/[$BM]/g, ""));
    return 0;
  });
  return (
    <section className="relative py-32 px-8 overflow-hidden bg-[#0a1219]">
      <Blobs />
      <div className="relative max-w-6xl mx-auto">
        <SectionLabel number="03" label="Routing Universe" />
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <h2 className="text-[44px] leading-[1.1] font-light max-w-2xl text-white">
            Every major Solana yield venue,{" "}
            <span className="font-instrument italic font-normal gradient-text">evaluated live.</span>
          </h2>
          <div className="flex gap-2 text-xs tracking-wider uppercase">
            {(["apy", "tvl"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={
                  sortBy === key ? "btn-primary !py-2 !px-3 !text-xs" : "btn-secondary !py-2 !px-3 !text-xs"
                }
              >
                Sort {key.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="glass-card p-2">
          <div className="grid grid-cols-5 gap-4 px-6 py-4 text-xs tracking-wider uppercase text-white/50 border-b border-white/[0.04]">
            <div>Venue</div><div>Strategy</div><div>TVL</div><div>Net APY</div><div className="text-right">Risk Tier</div>
          </div>
          {sorted.map((v, i) => (
            <div
              key={v.name}
              className={`grid grid-cols-5 gap-4 px-6 py-5 items-center transition-all hover:bg-white/[0.03] ${i !== sorted.length - 1 ? "border-b border-white/[0.04]" : ""}`}
            >
              <div className="font-medium text-white">{v.name}</div>
              <div className="text-white/70 text-sm">{v.type}</div>
              <div className="font-mono text-sm text-white/90">{v.tvl}</div>
              <div className="font-instrument italic text-2xl gradient-text">{v.apy}%</div>
              <div className="text-right">
                <RiskBadge risk={v.risk} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-white/40 text-xs mt-4">Sample data for illustration. Live venue coverage expands with every Solana DeFi integration.</p>
      </div>
    </section>
  );
}

function AgentLogic() {
  const signals = [
    { name: "Net APY projection", weight: "35%", desc: "Forward-looking yield after fees, MEV, and gas amortization." },
    { name: "Liquidity depth", weight: "25%", desc: "Exit slippage modeled at full position size." },
    { name: "Protocol risk score", weight: "20%", desc: "Audit history, TVL concentration, oracle dependency." },
    { name: "Correlation buffer", weight: "15%", desc: "Diversification weight against already-held positions." },
    { name: "Rebalancing cost", weight: "5%", desc: "Gas and opportunity cost of moving capital." },
  ];
  return (
    <section className="relative py-32 px-8 overflow-hidden bg-[#0F1923]">
      <Blobs />
      <div className="relative max-w-6xl mx-auto">
        <SectionLabel number="04" label="Agent Logic" />
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <h2 className="text-[44px] leading-[1.1] font-light mb-8 text-white">
              An allocator that{" "}
              <span className="font-instrument italic font-normal gradient-text">thinks in basis points.</span>
            </h2>
            <p className="text-white/70 leading-relaxed mb-8">
              The Yieldfy agent is a deterministic policy engine — not a black box. Every routing decision is explainable, auditable, and constrained by institutional risk parameters you define.
            </p>
            <div className="space-y-6 mt-12">
              {[
                { title: "Configurable risk budget", desc: "Cap exposure per protocol, chain, or strategy." },
                { title: "Hysteresis thresholds", desc: "Prevents churn from transient APY spikes." },
                { title: "Emergency circuit breakers", desc: "Auto-exit on protocol anomaly or peg deviation." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <span className="font-mono text-xs gradient-text mt-1">→</span>
                  <div>
                    <div className="text-sm font-medium mb-1 text-white">{item.title}</div>
                    <div className="text-white/60 text-sm">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card p-10">
            <div className="text-xs tracking-wider uppercase text-white/50 mb-6">Scoring weights</div>
            <div className="space-y-5">
              {signals.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-sm text-white">{s.name}</span>
                    <span className="font-mono text-sm gradient-text">{s.weight}</span>
                  </div>
                  <div className="h-[3px] bg-white/10 rounded-full mb-2 overflow-hidden">
                    <div className="h-full gradient-bg rounded-full" style={{ width: s.weight }} />
                  </div>
                  <p className="text-white/50 text-xs">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Security() {
  const items = [
    { title: "Non-custodial by design", body: "Yieldfy never takes custody. Routing contracts execute against your signed intents; your keys, your treasuries." },
    { title: "Dual-chain audits", body: "Solana programs and XRPL hooks audited by two independent firms. Reports published in full." },
    { title: "Proof-of-reserve", body: "Cryptographic attestation of bridged position parity, posted on-chain every epoch." },
    { title: "Institutional access control", body: "Multi-sig, HSM-backed signers, and role-based permissions out of the box." },
  ];
  return (
    <section className="relative py-32 px-8 overflow-hidden bg-[#0a1219]">
      <Blobs />
      <div className="relative max-w-6xl mx-auto">
        <SectionLabel number="05" label="Security" />
        <h2 className="text-[44px] leading-[1.1] font-light mb-16 max-w-3xl text-white">
          Built for capital that{" "}
          <span className="font-instrument italic font-normal gradient-text">cannot afford to be wrong.</span>
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {items.map((x) => (
            <div key={x.title} className="glass-card glass-card-hover p-10">
              <GradientDot className="mb-6" />
              <h3 className="text-xl font-light mb-3 text-white">{x.title}</h3>
              <p className="text-white/70 leading-relaxed text-sm">{x.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    { name: "Desk", tag: "For small treasuries", fee: "25 bps", feeNote: "performance fee on yield generated", features: ["Up to $10M routed", "Standard venue coverage", "Monthly reporting", "Email support"] },
    { name: "Institutional", tag: "For funds & family offices", fee: "15 bps", feeNote: "performance fee + custom terms", features: ["Unlimited routing", "Full venue coverage", "Custom risk policies", "Dedicated desk", "SLA-backed settlement"], featured: true },
    { name: "Protocol", tag: "For DAOs & issuers", fee: "Custom", feeNote: "revenue-share or flat fee", features: ["White-label routing", "API-first integration", "Co-branded reporting", "Governance hooks"] },
  ];
  return (
    <section className="relative py-32 px-8 overflow-hidden bg-[#0F1923]">
      <Blobs />
      <div className="relative max-w-6xl mx-auto">
        <SectionLabel number="06" label="Pricing" />
        <h2 className="text-[44px] leading-[1.1] font-light mb-16 max-w-3xl text-white">
          Aligned with your yield —{" "}
          <span className="font-instrument italic font-normal gradient-text">not your TVL.</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((t) => {
            const card = (
              <div className={`p-10 relative h-full glass-card ${t.featured ? "pricing-featured" : "glass-card-hover"}`}>
                {t.featured && (
                  <div className="absolute top-4 right-4 gradient-bg text-[#0F1923] text-[10px] tracking-widest uppercase px-3 py-1.5 rounded-full font-semibold">Most chosen</div>
                )}
                <div className="text-xs tracking-wider uppercase mb-2 text-white/50">{t.tag}</div>
                <h3 className="text-3xl font-light mb-6 text-white">{t.name}</h3>
                <div className="mb-2">
                  <span className={`font-instrument italic text-5xl ${t.featured ? "gradient-text metric-glow" : "text-white"}`}>{t.fee}</span>
                </div>
                <div className="text-xs mb-8 text-white/60">{t.feeNote}</div>
                <ul className="space-y-3 mb-10">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-3 text-sm">
                      <GradientDot className="mt-[7px]" />
                      <span className="text-white/80">{f}</span>
                    </li>
                  ))}
                </ul>
                <button className={t.featured ? "btn-primary w-full" : "btn-secondary w-full"}>
                  {t.featured ? "Talk to our desk" : "Get started"}
                </button>
              </div>
            );
            return t.featured ? (
              <div key={t.name} className="glass-refraction">
                <div className="glass-refraction-inner h-full">{card}</div>
              </div>
            ) : (
              <div key={t.name}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);
  const items = [
    { q: "Which RWA tokens are supported?", a: "Yieldfy currently routes OUSG, TBILL, and other XRPL-issued tokenized treasuries. Support for additional tokenized T-bills, money market funds, and private credit is added as issuers go live." },
    { q: "How does Yieldfy preserve compliance?", a: "Each bridged position carries signed compliance metadata — issuer whitelist status, accredited-investor flags, and jurisdictional restrictions — that Solana-side contracts enforce before allocating capital." },
    { q: "What happens if a Solana venue fails?", a: "Circuit breakers trigger an emergency exit and settle capital back to a safe stablecoin reserve. If the loss event is pre-exit, it's absorbed at the venue, not at the routing layer." },
    { q: "Is the agent open-source?", a: "The routing contracts on both chains are open-source and audited. The scoring engine is published under a source-available license for institutional review." },
    { q: "How fast can I exit?", a: "Soft exits (unwinding to stable reserves on Solana) settle within one block. Full XRPL repatriation completes in under nine seconds on average." },
  ];
  return (
    <section className="relative py-32 px-8 overflow-hidden bg-[#0a1219]">
      <Blobs />
      <div className="relative max-w-4xl mx-auto">
        <SectionLabel number="07" label="Questions" />
        <h2 className="text-[44px] leading-[1.1] font-light mb-16 text-white">
          Frequently{" "}
          <span className="font-instrument italic font-normal gradient-text">asked.</span>
        </h2>
        <div className="glass-card p-2">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className={`${i !== items.length - 1 ? "border-b border-white/[0.04]" : ""} ${isOpen ? "faq-open" : ""}`}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex justify-between items-center py-6 px-4 text-left transition-colors"
                >
                  <span className="text-lg font-light text-white">{item.q}</span>
                  <span
                    className="font-mono text-xl transition-all duration-300"
                    style={{
                      color: isOpen ? "#2EC4B6" : "rgba(255,255,255,0.3)",
                      transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="pb-6 px-4 text-white/70 leading-relaxed max-w-2xl">{item.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="relative py-40 px-8 overflow-hidden bg-[#0F1923]">
      <Blobs variant="medium" />
      <div className="relative max-w-4xl mx-auto text-center">
        <div className="glass-refraction">
          <div className="glass-refraction-inner">
            <CornerFrame className="py-20 px-8">
              <div className="glass-pill mb-10">
                <div className="glass-pill-inner">Now accepting institutional pilots</div>
              </div>
              <h2 className="text-[64px] leading-[1.05] font-light mb-6 text-white">
                Your treasuries are{" "}
                <span className="font-instrument italic font-normal gradient-text">working harder</span>
                <br />
                by tomorrow morning.
              </h2>
              <p className="text-white/70 text-lg max-w-xl mx-auto mb-10">
                Onboard in a single call. Full integration in under two weeks.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button className="btn-primary">Book a demo</button>
                <button className="btn-secondary">Read the docs</button>
              </div>
            </CornerFrame>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="relative py-20 px-8 overflow-hidden bg-[#0a1219]">
      <div className="relative max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <div className="text-3xl font-light tracking-tight mb-4 text-white">
              yieldfy<span style={{ color: "#2EC4B6" }}>.</span>
            </div>
            <p className="text-white/60 max-w-sm text-sm leading-relaxed">
              An autonomous routing agent bridging XRPL tokenized treasuries to the best Solana yield venues.
            </p>
          </div>
          <div>
            <div className="text-xs tracking-wider uppercase text-white/50 mb-4">Product</div>
            <ul className="space-y-2 text-sm text-white/80">
              {["How it works", "Venues", "Pricing", "Documentation"].map((item) => (
                <li key={item} className="hover:text-white transition-colors cursor-pointer">{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs tracking-wider uppercase text-white/50 mb-4">Company</div>
            <ul className="space-y-2 text-sm text-white/80">
              {["About", "Security", "Audits", "Contact"].map((item) => (
                <li key={item} className="hover:text-white transition-colors cursor-pointer">{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs text-white/50">
          <div>© 2026 Yieldfy. All rights reserved.</div>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Disclosures"].map((item) => (
              <span key={item} className="hover:text-white transition-colors cursor-pointer">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function YieldfyLanding() {
  return (
    <main className="bg-[#0F1923] text-white font-barlow">
      <HowItWorks />
      <Metrics />
      <Architecture />
      <Venues />
      <AgentLogic />
      <Security />
      <Pricing />
      <FAQ />
      <CTASection />
      <FooterSection />
    </main>
  );
}
