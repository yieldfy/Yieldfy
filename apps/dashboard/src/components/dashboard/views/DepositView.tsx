import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { toast } from "sonner";
import {
  fetchAttestation,
  type Attestation,
  type RiskProfile,
} from "@yieldfy/sdk";
import { useWxrpBalance, WXRP_MINT } from "@/hooks/useWxrpBalance";
import { useYieldfyClient } from "@/hooks/useYieldfyClient";
import { useRiskProfile } from "@/hooks/useRiskProfile";
import { env } from "@/env";

type Stage = "idle" | "attesting" | "signing" | "confirming" | "done" | "error";

const RISKS: { key: RiskProfile; label: string; desc: string }[] = [
  { key: "conservative", label: "Conservative", desc: "Tilts toward TVL and audit quality" },
  { key: "balanced", label: "Balanced", desc: "Default 50/20/10/10/10 weighting" },
  { key: "opportunistic", label: "Opportunistic", desc: "Tilts toward APY" },
];

const OPTIMIZER_URL = env.VITE_OPTIMIZER_URL;

const parseAmount = (raw: string): bigint | null => {
  const stripped = raw.replace(/[,\s]/g, "");
  if (!stripped) return null;
  const [whole, frac = ""] = stripped.split(".");
  if (!/^\d+$/.test(whole) || (frac && !/^\d+$/.test(frac))) return null;
  const padded = (frac + "000000").slice(0, 6);
  try {
    return BigInt(whole) * 1_000_000n + BigInt(padded || "0");
  } catch {
    return null;
  }
};

const DepositView = () => {
  const { connected } = useWallet();
  const { data: balance, refetch: refetchBalance } = useWxrpBalance();
  const clientState = useYieldfyClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState("");
  const [profile, setProfile] = useRiskProfile();

  const [stage, setStage] = useState<Stage>("idle");
  const [attestation, setAttestation] = useState<Attestation | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(
    () => () => {
      cancelled.current = true;
    },
    [],
  );

  const amountLamports = parseAmount(amount);
  const amountValid =
    amountLamports !== null &&
    amountLamports > 0n &&
    (!balance || Number(amountLamports) / 1e6 <= balance);

  const reset = useCallback(() => {
    setStep(1);
    setAmount("");
    setStage("idle");
    setAttestation(null);
    setTxSig(null);
    setErrMsg(null);
  }, []);

  const onConfirm = useCallback(async () => {
    if (!amountLamports || !amountValid) return;
    setStep(3);
    setStage("attesting");
    setErrMsg(null);
    try {
      const att = await fetchAttestation(OPTIMIZER_URL, profile);
      if (cancelled.current) return;
      setAttestation(att);

      if (clientState.kind !== "ready") {
        throw new Error(
          clientState.kind === "disconnected"
            ? "Wallet disconnected mid-flow."
            : "VITE_YIELDFY_PROGRAM_ID not configured — can't sign on-chain yet.",
        );
      }

      setStage("signing");
      const sig = await clientState.client.deposit({ amount: amountLamports }, att);
      if (cancelled.current) return;

      setStage("confirming");
      setTxSig(sig);
      setStage("done");
      void refetchBalance();
      toast.success("Deposit confirmed", { description: sig.slice(0, 10) + "…" });
    } catch (err) {
      if (cancelled.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      setErrMsg(msg);
      setStage("error");
      toast.error("Deposit failed", { description: msg });
    }
  }, [amountLamports, amountValid, profile, clientState, refetchBalance]);

  const connectCard = useMemo(
    () => (
      <div className="text-center">
        <h2 className="font-barlow text-2xl font-medium text-[#0F1923] mb-1">
          Connect wallet
        </h2>
        <p className="text-sm text-[#0F1923]/60 mb-6">
          Connect a Solana wallet to deposit wXRP.
        </p>
        <div className="yieldfy-wallet-btn inline-block">
          <WalletMultiButton />
        </div>
      </div>
    ),
    [],
  );

  if (!connected) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="glass-card p-6 md:p-8">{connectCard}</div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="glass-card p-6 md:p-8">
        <StepBar step={step} />

        {step === 1 && (
          <>
            <h2 className="font-barlow text-2xl font-medium text-[#0F1923] mb-1">
              Deposit wXRP
            </h2>
            <p className="text-sm text-[#0F1923]/60 mb-6">
              Route wrapped XRP into the best-scoring Solana yield venue.
            </p>

            <div className="text-center mb-2">
              <input
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-center font-instrument italic text-5xl gradient-text outline-none"
              />
            </div>
            <div className="flex items-center justify-center gap-3 mb-6 text-xs text-[#0F1923]/60">
              <span>
                Available:{" "}
                {balance === undefined
                  ? "…"
                  : `${balance.toLocaleString("en-US", { maximumFractionDigits: 4 })} wXRP`}
              </span>
              {balance !== undefined && balance > 0 && (
                <button
                  onClick={() => setAmount(String(balance))}
                  className="px-2 py-0.5 rounded-full bg-white/60 hover:bg-white/90 text-[#0F1923] font-medium transition-colors"
                >
                  MAX
                </button>
              )}
            </div>

            {!WXRP_MINT && (
              <div className="mb-6 rounded-xl border border-amber-300/60 bg-amber-50/60 p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  <code>VITE_WXRP_MINT</code> isn't set — balance shows 0 until
                  you drop the mainnet / devnet mint into <code>.env.local</code>.
                </span>
              </div>
            )}

            <div className="text-xs uppercase tracking-wider text-[#0F1923]/40 mb-3">
              Risk profile
            </div>
            <div className="space-y-2 mb-6">
              {RISKS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setProfile(r.key)}
                  className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all ${
                    profile === r.key
                      ? "gradient-bg text-white"
                      : "bg-white/50 hover:bg-white/80 text-[#0F1923]"
                  }`}
                >
                  <span className="font-medium text-sm">{r.label}</span>
                  <span
                    className={`text-xs ${profile === r.key ? "text-white/85" : "text-[#0F1923]/55"}`}
                  >
                    {r.desc}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!amountValid}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Review
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-barlow text-2xl font-medium text-[#0F1923] mb-6">
              Review &amp; confirm
            </h2>
            <div className="rounded-2xl bg-white/50 p-5 mb-4 space-y-3 text-sm">
              <Row label="Asset" value="wXRP" />
              <Row
                label="Amount"
                value={`${Number(amountLamports) / 1e6} wXRP`}
              />
              <Row label="Risk profile" value={RISKS.find((r) => r.key === profile)!.label} />
              <Row label="Optimizer" value={OPTIMIZER_URL} />
            </div>

            {clientState.kind === "missing-program-id" && (
              <div className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50/60 p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  <code>VITE_YIELDFY_PROGRAM_ID</code> isn't set. You can still
                  fetch a signed attestation, but signing the on-chain tx will
                  fail until yieldfy deploys the Anchor program and you set
                  the ID.
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">
                Back
              </button>
              <button onClick={onConfirm} className="btn-primary flex-1">
                Confirm deposit
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <Processing
            stage={stage}
            attestation={attestation}
            txSig={txSig}
            errMsg={errMsg}
            onReset={reset}
            onRetry={onConfirm}
          />
        )}
      </div>
    </div>
  );
};

const StepBar = ({ step }: { step: 1 | 2 | 3 }) => (
  <div className="flex items-center gap-2 mb-6">
    {[1, 2, 3].map((n) => (
      <div
        key={n}
        className={`h-1 flex-1 rounded-full transition-all ${
          n <= step ? "gradient-bg" : "bg-[#0F1923]/10"
        }`}
      />
    ))}
  </div>
);

const STAGE_LABEL: Record<Stage, string> = {
  idle: "Preparing",
  attesting: "Fetching attestation",
  signing: "Awaiting wallet signature",
  confirming: "Confirming on Solana",
  done: "Deposit confirmed",
  error: "Deposit failed",
};

type ProcessingProps = {
  stage: Stage;
  attestation: Attestation | null;
  txSig: string | null;
  errMsg: string | null;
  onReset: () => void;
  onRetry: () => void;
};

const Processing = ({
  stage,
  attestation,
  txSig,
  errMsg,
  onReset,
  onRetry,
}: ProcessingProps) => {
  const steps: { key: Stage; label: string }[] = [
    { key: "attesting", label: "Fetch signed attestation" },
    { key: "signing", label: "Sign transaction in wallet" },
    { key: "confirming", label: "Confirm on Solana" },
  ];

  const order = (s: Stage) =>
    ({ attesting: 0, signing: 1, confirming: 2, done: 3, idle: -1, error: -1 })[s];
  const currentOrder = order(stage);

  if (stage === "done") {
    return (
      <div className="text-center py-6">
        <div className="mx-auto h-20 w-20 rounded-full gradient-bg flex items-center justify-center mb-5">
          <CheckCircle2 size={44} className="text-white" strokeWidth={2} />
        </div>
        <h2 className="font-barlow text-2xl font-medium text-[#0F1923]">
          Deposit complete
        </h2>
        {attestation && (
          <p className="text-sm text-[#0F1923]/60 mt-2">
            Routed to <span className="font-medium text-[#0F1923]">{attestation.venue}</span>{" "}
            · slot {attestation.slot}
          </p>
        )}
        {txSig && (
          <a
            href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs text-[#0F1923]/70 hover:text-[#0F1923]"
          >
            View on Solscan <ExternalLink size={12} />
          </a>
        )}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button onClick={onReset} className="btn-primary flex-1">
            New deposit
          </button>
        </div>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="text-center py-6">
        <div className="mx-auto h-20 w-20 rounded-full bg-[#E84855]/15 flex items-center justify-center mb-5">
          <AlertTriangle size={38} className="text-[#E84855]" />
        </div>
        <h2 className="font-barlow text-2xl font-medium text-[#0F1923]">
          Deposit failed
        </h2>
        {errMsg && (
          <p className="text-xs text-[#0F1923]/70 mt-2 max-w-sm mx-auto break-words">
            {errMsg}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button onClick={onReset} className="btn-secondary flex-1">
            Start over
          </button>
          <button onClick={onRetry} className="btn-primary flex-1">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="font-barlow text-2xl font-medium text-[#0F1923] mb-1">
        {STAGE_LABEL[stage]}
      </h2>
      <p className="text-sm text-[#0F1923]/60 mb-6">
        Hang tight — this usually takes under ten seconds.
      </p>
      <div className="space-y-3">
        {steps.map((s, i) => {
          const complete = i < currentOrder;
          const active = i === currentOrder;
          return (
            <div
              key={s.key}
              className="flex items-center gap-3 rounded-xl bg-white/50 px-4 py-3"
            >
              <div className="h-7 w-7 flex items-center justify-center rounded-full">
                {complete ? (
                  <CheckCircle2 size={20} className="text-[#2EC4B6]" />
                ) : active ? (
                  <Loader2 size={18} className="animate-spin text-[#0F1923]/70" />
                ) : (
                  <div className="h-3 w-3 rounded-full bg-[#0F1923]/15" />
                )}
              </div>
              <div className="flex-1">
                <div
                  className={`text-sm ${complete || active ? "text-[#0F1923]" : "text-[#0F1923]/40"}`}
                >
                  {s.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {attestation && stage !== "attesting" && (
        <div className="mt-4 rounded-xl bg-white/40 px-4 py-3 text-xs text-[#0F1923]/70 space-y-1">
          <div>
            Attestor:{" "}
            <code className="text-[#0F1923]">
              {attestation.pubkeyBase58.slice(0, 6)}…
              {attestation.pubkeyBase58.slice(-4)}
            </code>
          </div>
          <div>
            Venue: <span className="text-[#0F1923]">{attestation.venue}</span>{" "}
            · slot <span className="text-[#0F1923]">{attestation.slot}</span>
          </div>
        </div>
      )}
    </>
  );
};

const Row = ({
  label,
  value,
  gradient,
}: {
  label: string;
  value: string;
  gradient?: boolean;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-xs uppercase tracking-wider text-[#0F1923]/40">
      {label}
    </span>
    <span
      className={
        gradient
          ? "font-instrument italic gradient-text text-lg"
          : "text-[#0F1923] font-medium"
      }
    >
      {value}
    </span>
  </div>
);

export default DepositView;
