import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { useMemo } from "react";
import { env } from "@/env";
import "@solana/wallet-adapter-react-ui/styles.css";

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => env.VITE_SOLANA_RPC_URL, []);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
