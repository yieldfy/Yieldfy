import { Loader2 } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useYieldfyPosition } from "@/hooks/useYieldfyPosition";
import { PROGRAM_ID } from "@/hooks/useYieldfyClient";
import EmptyState from "../EmptyState";

const fmtWxrp = (base: bigint) => {
  const whole = base / 1_000_000n;
  const frac = base % 1_000_000n;
  if (frac === 0n) return whole.toLocaleString("en-US");
  return (
    whole.toLocaleString("en-US") +
    "." +
    String(frac).padStart(6, "0").replace(/0+$/, "")
  );
};

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
  const { data: position, isLoading, isFetching } = useYieldfyPosition();

  if (!connected) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-5 md:p-6">
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Total Value" value="—" />
            <Stat label="APY" value="—" gradient />
            <Stat label="Yield Earned" value="—" />
          </div>
        </div>
        <EmptyState
          title="No positions yet"
          description="Connect your wallet to view your positions."
        />
      </div>
    );
  }

  if (!PROGRAM_ID) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Program not configured"
          description="Set VITE_YIELDFY_PROGRAM_ID in .env.local (populated once yieldfy deploys the Anchor program)."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glass-card p-10 flex items-center justify-center">
        <Loader2 size={18} className="animate-spin text-[#0F1923]/50" />
        <span className="ml-3 text-sm text-[#0F1923]/60">Reading position PDA…</span>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-5 md:p-6">
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Principal" value="—" />
            <Stat label="yXRP Supply" value="—" gradient />
            <Stat label="Venue" value="—" />
          </div>
        </div>
        <EmptyState
          title="No positions yet"
          description="Your yXRP position will appear here after your first deposit routes on-chain."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5 md:p-6">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Principal" value={`${fmtWxrp(position.principal)} wXRP`} />
          <Stat
            label="yXRP Supply"
            value={fmtWxrp(position.receiptSupply)}
            gradient
          />
          <Stat label="Venue" value={position.venue} />
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-barlow text-xl font-medium text-[#0F1923] mb-5">
          Position detail
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Row label="Owner" value={truncate(position.owner.toBase58())} />
          <Row label="Venue code" value={String(position.venueCode)} />
          <Row
            label="Last update"
            value={new Date(Number(position.lastUpdate) * 1000).toLocaleString()}
          />
          <Row
            label="Bump"
            value={String(position.bump)}
            trailing={
              isFetching ? (
                <Loader2 size={12} className="animate-spin text-[#0F1923]/40" />
              ) : null
            }
          />
        </div>
      </div>
    </div>
  );
};

const truncate = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

const Row = ({
  label,
  value,
  trailing,
}: {
  label: string;
  value: string;
  trailing?: React.ReactNode;
}) => (
  <div className="rounded-xl bg-white/40 p-3">
    <div className="text-[10px] uppercase tracking-wider text-[#0F1923]/40 flex items-center gap-2">
      <span>{label}</span>
      {trailing}
    </div>
    <div className="mt-1 text-[#0F1923] font-mono text-xs break-all">{value}</div>
  </div>
);

export default PositionsView;
