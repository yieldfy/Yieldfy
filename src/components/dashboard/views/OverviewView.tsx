import { Loader2 } from "lucide-react";
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
    { label: "Yield Earned", value: "—", hint: "No positions yet" },
    { label: "Current APY", value: "—", hint: "No positions yet" },
    { label: "Active Venues", value: "0 / 4", hint: "Kamino live at MVP" },
  ];

  return (
    <div className="space-y-6">
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
