/**
 * WalletMenu — replaces the default dark wallet-adapter dropdown with a
 * cream/glass-themed menu that fits the rest of the dashboard.
 *
 * Items:
 *   1. Copy address      — clipboard write + sonner toast
 *   2. View on Solscan   — opens https://solscan.io/account/<pubkey> in new tab
 *   3. Disconnect        — danger-styled (red), calls wallet adapter disconnect
 *
 * Only rendered when a wallet is already connected (the gate guarantees that
 * by the time DashboardLayout mounts).
 */
import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Copy, ExternalLink, LogOut, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useNetwork } from "@/providers/NetworkProvider";
import { useDisconnectWallet } from "@/hooks/useWalletGuard";

const truncate = (addr: string, head = 4, tail = 4) =>
  `${addr.slice(0, head)}…${addr.slice(-tail)}`;

const WalletMenu = () => {
  const { publicKey, wallet } = useWallet();
  const { solscanUrl } = useNetwork();
  const disconnectWallet = useDisconnectWallet();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!publicKey) return null;
  const addr = publicKey.toBase58();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(addr);
      toast.success("Address copied");
    } catch {
      toast.error("Couldn't copy address");
    }
    setOpen(false);
  };

  const onDisconnect = async () => {
    setOpen(false);
    await disconnectWallet("You have been disconnected.");
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-full border border-[#0F1923]/8 bg-white/60 px-3 backdrop-blur-md transition-colors hover:bg-white/80"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {wallet?.adapter?.icon && (
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0F1923]/[0.04] p-1">
            <img
              src={wallet.adapter.icon}
              alt={wallet.adapter.name}
              className="h-full w-full object-contain"
            />
          </span>
        )}
        <span className="font-mono text-xs text-[#0F1923]">
          {truncate(addr, 6, 4)}
        </span>
        <ChevronDown
          size={14}
          className={`text-[#0F1923]/50 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-[#0F1923]/8 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl"
        >
          <MenuItem icon={<Copy size={14} />} label="Copy address" onClick={onCopy} />
          <a
            href={solscanUrl("account", addr)}
            target="_blank"
            rel="noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#0F1923] bg-white/0 hover:bg-[#0F1923]/[0.05] transition-colors"
          >
            <ExternalLink size={14} />
            <span>Solscan</span>
          </a>
          <div className="my-1 h-px bg-[#0F1923]/[0.08]" />
          <button
            type="button"
            role="menuitem"
            onClick={onDisconnect}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#dc2626] hover:bg-[#dc2626]/[0.08] transition-colors"
          >
            <LogOut size={14} />
            <span>Disconnect</span>
          </button>
        </div>
      )}
    </div>
  );
};

const MenuItem = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#0F1923] hover:bg-[#0F1923]/[0.05] transition-colors"
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default WalletMenu;
