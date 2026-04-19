import { useWallet } from "@solana/wallet-adapter-react";
import EmptyState from "../EmptyState";

const Stat = ({
  label,
  value,
  gradient,
}: {
  label: string;
  value: string;
  gradient?: boolean;
}) => (
  <div>
    <div className="text-xs uppercase tracking-wider text-[#0F1923]/40">{label}</div>
    <div
      className={`mt-1 font-instrument italic text-2xl md:text-3xl ${
        gradient ? "gradient-text" : "text-[#0F1923]"
      }`}
    >
      {value}
    </div>
  </div>
);

const PositionsView = () => {
  const { connected } = useWallet();

  return (
    <div className="space-y-6">
      <div className="glass-card p-5 md:p-6">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Total Value" value="—" />
          <Stat label="Weighted Avg APY" value="—" gradient />
          <Stat label="Total Yield Earned" value="—" />
        </div>
      </div>

      <EmptyState
        title="No positions yet"
        description={
          connected
            ? "Your yXRP positions will appear here after your first deposit is routed on-chain."
            : "Connect your wallet to view your positions."
        }
      />
    </div>
  );
};

export default PositionsView;
