import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { useMemo } from "react";
import { useNetwork } from "@/providers/NetworkProvider";
import "@solana/wallet-adapter-react-ui/styles.css";

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const { endpoint, network } = useNetwork();
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  // key forces ConnectionProvider/WalletProvider to remount on network switch,
  // dropping any in-flight subscriptions tied to the previous cluster.
  return (
    <ConnectionProvider key={network} endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
