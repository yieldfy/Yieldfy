import { Loader2, Sparkles } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWxrpBalance, WXRP_MINT } from "@/hooks/useWxrpBalance";
import EmptyState from "../EmptyState";

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs uppercase tracking-wider text-[#0F1923]/40">{children}</div>
);

const fmtWxrp = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 4 });

const OverviewView = () => {
  const { connected } = useWallet();
  const { data: balance, isLoading: balanceLoading } = useWxrpBalance();

  const balanceDisplay = !connected
    ? "—"
    : !WXRP_MINT
      ? "—"
      : balanceLoading
        ? "…"
        : `${fmtWxrp(balance ?? 0)}`;

  const metrics = [
    {
      label: "wXRP Balance",
      value: balanceDisplay,
      hint: !connected
        ? "Connect wallet"
        : !WXRP_MINT
          ? "Set VITE_WXRP_MINT"
          : "Spot wXRP in wallet",
    },
    { label: "Yield Earned", value: "—", hint: "Phase B — wrapper only" },
    { label: "Current APY", value: "—", hint: "Active routing: awaiting venue wXRP listing" },
    { label: "Active Venues", value: "0 / 4", hint: "Kamino/MarginFi/Drift/Meteora integrations pending" },
  ];

  return (
    <div className="space-y-6">
      {/* Launch Rewards preview — activates at $YIELDFY launch */}
      <div className="relative overflow-hidden glass-card p-5 md:p-6 border border-[#0F1923]/8">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full gradient-bg opacity-20 blur-2xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="shrink-0 h-10 w-10 rounded-full gradient-bg flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-barlow text-lg md:text-xl font-medium text-[#0F1923]">
                SOL yield activates at $YIELDFY launch
              </h3>
              <span className="text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full gradient-bg text-[#0F1923] font-semibold">
                Phase 2
              </span>
            </div>
            <p className="text-sm text-[#0F1923]/65 leading-relaxed">
              Hold $YIELDFY <span className="text-[#0F1923]">and</span> keep wXRP in the vault — both required —
              to earn weekly SOL distributions sized as a fraction of $YIELDFY market cap. More token + more vault
              + higher MC = larger share. Bootstrapped from protocol treasury until lending venues list wXRP.
            </p>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-[#0F1923]/40 uppercase tracking-wider mb-1">Cadence</div>
                <div className="text-[#0F1923] font-medium">Weekly</div>
              </div>
              <div>
                <div className="text-[#0F1923]/40 uppercase tracking-wider mb-1">Pool size</div>
                <div className="text-[#0F1923] font-medium">0.0675% of MC</div>
              </div>
              <div>
                <div className="text-[#0F1923]/40 uppercase tracking-wider mb-1">Eligibility</div>
                <div className="text-[#0F1923] font-medium">Both required</div>
              </div>
              <div>
                <div className="text-[#0F1923]/40 uppercase tracking-wider mb-1">Distributed in</div>
                <div className="text-[#0F1923] font-medium">SOL</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="glass-card glass-card-hover p-5">
            <Label>{m.label}</Label>
            <div className="mt-2 font-instrument italic gradient-text text-3xl md:text-4xl leading-none">
              {m.value}
            </div>
            <div className="mt-3 text-xs text-[#0F1923]/40">{m.hint}</div>
          </div>
        ))}
      </div>

      {/* Chart + Positions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-barlow text-xl font-medium text-[#0F1923]">
              Yield Performance
            </h3>
          </div>
          <div className="h-[260px] flex items-center justify-center">
            <EmptyState
              className="w-full h-full"
              title="No yield history yet"
              description="Your APY chart will appear here once the first deposit lands on-chain."
            />
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-barlow text-xl font-medium text-[#0F1923] mb-5">
            Active Positions
          </h3>
          <EmptyState
            title="No active positions"
            description={
              connected
                ? "Deposit wXRP to start earning Solana yield."
                : "Connect your wallet to view positions."
            }
          />
        </div>
      </div>

      {/* Recent activity */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-barlow text-xl font-medium text-[#0F1923]">
            Recent Activity
          </h3>
        </div>
        <EmptyState
          title="No activity yet"
          description="Deposits, rebalances, and yield claims will stream here as they happen."
          action={
            balanceLoading ? (
              <Loader2 size={14} className="animate-spin text-[#0F1923]/40" />
            ) : null
          }
        />
      </div>
    </div>
  );
};

export default OverviewView;
