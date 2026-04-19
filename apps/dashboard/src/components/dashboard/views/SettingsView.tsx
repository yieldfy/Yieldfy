import { useWallet } from "@solana/wallet-adapter-react";
import type { RiskProfile } from "@yieldfy/sdk";
import { useRiskProfile } from "@/hooks/useRiskProfile";

const RISK_OPTIONS: {
  key: RiskProfile;
  label: string;
  desc: string;
  weights: string;
}[] = [
  {
    key: "conservative",
    label: "Conservative",
    desc: "Tilts toward TVL and audit quality",
    weights: "APY 35 · TVL 25 · Util 15 · Oracle 10 · Audit 15",
  },
  {
    key: "balanced",
    label: "Balanced",
    desc: "Default weighting for most accounts",
    weights: "APY 50 · TVL 20 · Util 10 · Oracle 10 · Audit 10",
  },
  {
    key: "opportunistic",
    label: "Opportunistic",
    desc: "Tilts toward APY",
    weights: "APY 70 · TVL 10 · Util 5 · Oracle 5 · Audit 10",
  },
];

const truncate = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

const SettingsView = () => {
  const { publicKey } = useWallet();
  const [profile, setProfile] = useRiskProfile();

  const rpc =
    (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined) ??
    "https://api.devnet.solana.com";
  const optimizer =
    (import.meta.env.VITE_OPTIMIZER_URL as string | undefined) ??
    "http://localhost:4000";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="glass-card p-6">
        <h3 className="font-barlow text-xl font-medium text-[#0F1923] mb-4">
          Account
        </h3>
        <div className="space-y-3 text-sm">
          <Row
            label="Connected Wallet"
            value={publicKey ? truncate(publicKey.toBase58()) : "Not connected"}
          />
          <Row label="Solana RPC" value={rpc} />
          <Row label="Optimizer" value={optimizer} />
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-barlow text-xl font-medium text-[#0F1923] mb-1">
          Risk profile
        </h3>
        <p className="text-xs text-[#0F1923]/60 mb-5">
          Used for every attestation request. Stored locally on this device.
        </p>
        <div className="space-y-2">
          {RISK_OPTIONS.map((r) => {
            const active = profile === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setProfile(r.key)}
                className={`w-full rounded-xl px-4 py-3 text-left transition-all ${
                  active
                    ? "gradient-bg text-white"
                    : "bg-white/50 hover:bg-white/80 text-[#0F1923]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{r.label}</span>
                  <span
                    className={`text-[11px] ${
                      active ? "text-white/80" : "text-[#0F1923]/50"
                    }`}
                  >
                    {r.desc}
                  </span>
                </div>
                <div
                  className={`mt-2 text-[10px] font-mono ${
                    active ? "text-white/75" : "text-[#0F1923]/50"
                  }`}
                >
                  {r.weights}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between border-b border-[#0F1923]/5 pb-3 last:border-0 gap-3">
    <span className="text-[#0F1923]/60 shrink-0">{label}</span>
    <span className="text-[#0F1923] font-medium font-mono text-xs break-all text-right">
      {value}
    </span>
  </div>
);

export default SettingsView;
