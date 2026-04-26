import { CheckCircle2, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWxrpBalance, WXRP_MINT } from "@/hooks/useWxrpBalance";
import { useRewardsClaim } from "@/hooks/useRewardsClaim";
import { useNetwork } from "@/providers/NetworkProvider";
import EmptyState from "../EmptyState";

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs uppercase tracking-wider text-[#0F1923]/40">{children}</div>
);

const fmtWxrp = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 4 });

const OverviewView = () => {
  const { connected } = useWallet();
  const { data: balance, isLoading: balanceLoading } = useWxrpBalance();
  const { state: claim, claim: doClaim } = useRewardsClaim();
  const { solscanUrl } = useNetwork();

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
      {/* Launch Rewards — preview before launch, claim flow once distributor is live */}
      <div className="relative overflow-hidden glass-card p-5 md:p-6 border border-[#0F1923]/8">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full gradient-bg opacity-20 blur-2xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="shrink-0 h-10 w-10 rounded-full gradient-bg flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-barlow text-lg md:text-xl font-medium text-[#0F1923]">
                {claim.kind === "ready"
                  ? `${claim.sol.toFixed(4)} SOL ready to claim`
                  : claim.kind === "claimed"
                    ? "Reward claimed"
                    : "SOL yield activates at $YIELDFY launch"}
              </h3>
              <span className="text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full gradient-bg text-[#0F1923] font-semibold">
                Phase 2
              </span>
            </div>

            {claim.kind === "ready" && (
              <>
                <p className="text-sm text-[#0F1923]/65 leading-relaxed">
                  Epoch {claim.epochId} payout is on-chain. Claim transfers from the
                  distributor treasury PDA directly to your wallet.
                </p>
                <button
                  onClick={doClaim}
                  className="btn-primary mt-4 inline-flex items-center gap-2"
                >
                  Claim {claim.sol.toFixed(4)} SOL
                </button>
              </>
            )}

            {claim.kind === "claiming" && (
              <p className="text-sm text-[#0F1923]/65 leading-relaxed inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Submitting claim transaction…
              </p>
            )}

            {claim.kind === "claimed" && (
              <>
                <p className="text-sm text-[#0F1923]/65 leading-relaxed inline-flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" /> Funds transferred to your wallet.
                </p>
                <a
                  href={solscanUrl("tx", claim.sig)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-[#0F1923]/70 hover:text-[#0F1923]"
                >
                  View on Solscan <ExternalLink size={12} />
                </a>
              </>
            )}

            {claim.kind === "error" && (
              <p className="text-sm text-[#E84855] leading-relaxed">{claim.message}</p>
            )}

            {(claim.kind === "disabled" || claim.kind === "no-claim" || claim.kind === "loading") && (
              <>
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
              </>
            )}
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
