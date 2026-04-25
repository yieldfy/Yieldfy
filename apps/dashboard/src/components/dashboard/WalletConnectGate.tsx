/**
 * WalletConnectGate — wraps the dashboard. While no wallet is connected,
 * the dashboard renders behind a blurred + non-interactive layer with a
 * connect modal floating in front. Once connected, the gate transparently
 * unmounts and the dashboard becomes interactive. Also installs the
 * wallet-switch / disconnect guard.
 */
import { ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import useWalletGuard from "@/hooks/useWalletGuard";
import yieldfyIcon from "@/assets/yieldfy-logo.png";

interface Props {
  children: ReactNode;
}

const WalletConnectGate = ({ children }: Props) => {
  const { connected } = useWallet();

  // Hook is only meaningful when connected; safe to mount unconditionally.
  useWalletGuard();

  if (!connected) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        {/* Blurred, non-interactive dashboard backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none blur-md scale-[1.01]"
        >
          {children}
        </div>

        {/* Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1923]/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-[#0F1923]/10 p-6 md:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F1923]/[0.04]">
                <img src={yieldfyIcon} alt="Yieldfy" className="h-10 w-10" />
              </div>
              <h2 className="font-barlow text-2xl font-light text-[#0F1923] mb-2">
                Connect a wallet to continue
              </h2>
              <p className="text-sm text-[#0F1923]/60 mb-6 max-w-xs">
                Yieldfy needs a Solana wallet to read your wXRP balance and submit deposits. Phantom and Solflare are supported.
              </p>
              <div className="yieldfy-wallet-btn">
                <WalletMultiButton />
              </div>
              <Link
                to="/"
                className="mt-5 inline-flex items-center gap-1 text-xs text-[#0F1923]/50 hover:text-[#0F1923] transition-colors"
              >
                <Wallet className="h-3 w-3" />
                Back to landing
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default WalletConnectGate;
