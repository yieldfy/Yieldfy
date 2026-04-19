import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Yieldfy } from "@yieldfy/sdk";
import { useMemo } from "react";

const rawProgramId = import.meta.env.VITE_YIELDFY_PROGRAM_ID as string | undefined;

export const PROGRAM_ID: PublicKey | null = (() => {
  if (!rawProgramId) return null;
  try {
    return new PublicKey(rawProgramId);
  } catch {
    console.warn(
      "[useYieldfyClient] VITE_YIELDFY_PROGRAM_ID is not a valid pubkey:",
      rawProgramId,
    );
    return null;
  }
})();

type ClientState =
  | { kind: "disconnected" }
  | { kind: "missing-program-id" }
  | { kind: "ready"; client: Yieldfy };

export function useYieldfyClient(): ClientState {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo<ClientState>(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      return { kind: "disconnected" };
    }
    if (!PROGRAM_ID) return { kind: "missing-program-id" };

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction.bind(wallet),
        signAllTransactions: wallet.signAllTransactions.bind(wallet),
      },
      { commitment: "confirmed" },
    );
    const client = new Yieldfy(provider, PROGRAM_ID);
    return { kind: "ready", client };
  }, [connection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions]);
}
