/**
 * WalletMenu — replaces the default dark wallet-adapter dropdown with a
 * cream/glass-themed menu that fits the rest of the dashboard.
 *
 * Items:
 *   1. Copy address      — clipboard write + sonner toast
 *   2. View on Solscan   — opens the cluster-aware Solscan account page
 *   3. Disconnect        — danger-styled (red), goes through useDisconnectWallet
 *
 * Built on Radix DropdownMenu so we get fade/zoom/slide animations,
 * focus management, outside-click, and Esc-to-close for free.
 */
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Copy, ExternalLink, LogOut, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNetwork } from "@/providers/NetworkProvider";
import { useDisconnectWallet } from "@/hooks/useWalletGuard";

const truncate = (addr: string, head = 4, tail = 4) =>
  `${addr.slice(0, head)}…${addr.slice(-tail)}`;

const WalletMenu = () => {
  const { publicKey, wallet } = useWallet();
  const { solscanUrl } = useNetwork();
  const disconnectWallet = useDisconnectWallet();
  const [open, setOpen] = useState(false);

  if (!publicKey) return null;
  const addr = publicKey.toBase58();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(addr);
      toast.success("Address copied");
    } catch {
      toast.error("Couldn't copy address");
    }
  };

  const onDisconnect = async () => {
    await disconnectWallet("You have been disconnected.");
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-10 items-center gap-2 rounded-full border border-[#0F1923]/8 bg-white/60 px-3 backdrop-blur-md transition-colors hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2EC4B6]/40"
          aria-label="Wallet menu"
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
            className={`text-[#0F1923]/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 origin-top-right rounded-2xl border border-[#0F1923]/8 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl"
      >
        <DropdownMenuItem
          onSelect={onCopy}
          className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#0F1923] focus:bg-[#0F1923]/[0.05] focus:text-[#0F1923] cursor-pointer gap-3"
        >
          <Copy size={14} />
          <span>Copy address</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#0F1923] focus:bg-[#0F1923]/[0.05] focus:text-[#0F1923] cursor-pointer gap-3"
        >
          <a href={solscanUrl("account", addr)} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />
            <span>Solscan</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#0F1923]/[0.08] my-1" />
        <DropdownMenuItem
          onSelect={onDisconnect}
          className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#dc2626] focus:bg-[#dc2626]/[0.08] focus:text-[#dc2626] cursor-pointer gap-3"
        >
          <LogOut size={14} />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WalletMenu;
