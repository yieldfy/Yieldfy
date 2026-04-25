import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNetwork, type Cluster } from "@/providers/NetworkProvider";
import { useNotifications } from "@/providers/NotificationsProvider";

const NetworkSwitcher = () => {
  const { network, setNetwork } = useNetwork();
  const { push } = useNotifications();
  const [pending, setPending] = useState<Cluster | null>(null);

  const onClick = (target: Cluster) => {
    if (target === network) return;
    setPending(target);
  };

  const onConfirm = () => {
    if (!pending) return;
    setNetwork(pending);
    push({
      level: pending === "mainnet" ? "success" : "warning",
      title: `Switched to ${pending === "mainnet" ? "Mainnet" : "Devnet"}`,
      body:
        pending === "devnet"
          ? "Devnet uses test tokens. Balances and yields are not real."
          : "You're back on Mainnet. Real funds.",
    });
    setPending(null);
  };

  const target = pending;
  const targetLabel = target === "mainnet" ? "Mainnet" : "Devnet";

  return (
    <>
      <div className="hidden sm:flex glass-pill">
        <div className="glass-pill-inner !py-1 !px-1 flex items-center gap-1">
          {(["mainnet", "devnet"] as const).map((n) => (
            <button
              key={n}
              onClick={() => onClick(n)}
              className={`px-3 py-1 rounded-full text-xs transition-all capitalize ${
                network === n ? "gradient-bg text-white" : "text-[#0F1923]/60 hover:text-[#0F1923]"
              }`}
            >
              {n === "mainnet" ? "Mainnet" : "Devnet"}
            </button>
          ))}
        </div>
      </div>

      <AlertDialog open={target !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-xl border-[#0F1923]/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-barlow text-[#0F1923]">
              Switch to {targetLabel}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#0F1923]/70">
              {target === "devnet"
                ? "You're about to switch to Solana Devnet. This is a test network — balances, yields, and transactions are not real. Your wallet will reconnect against the devnet RPC."
                : "You're about to switch to Solana Mainnet-beta. Real funds, real on-chain state. Your wallet will reconnect against the mainnet RPC."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className="rounded-full bg-[#0F1923] text-white hover:bg-[#0F1923]/90"
            >
              Switch to {targetLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default NetworkSwitcher;
