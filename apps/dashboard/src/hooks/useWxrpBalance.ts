import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from "@solana/spl-token";
import { useQuery } from "@tanstack/react-query";

const WXRP_DECIMALS = 6;

const rawMint = import.meta.env.VITE_WXRP_MINT as string | undefined;
export const WXRP_MINT: PublicKey | null = (() => {
  if (!rawMint) return null;
  try {
    return new PublicKey(rawMint);
  } catch {
    console.warn("[useWxrpBalance] VITE_WXRP_MINT is not a valid pubkey:", rawMint);
    return null;
  }
})();

export function useWxrpBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ["wxrp-balance", publicKey?.toBase58(), WXRP_MINT?.toBase58()],
    enabled: !!publicKey && !!WXRP_MINT,
    staleTime: 15_000,
    queryFn: async (): Promise<number> => {
      if (!publicKey || !WXRP_MINT) return 0;
      const ata = getAssociatedTokenAddressSync(WXRP_MINT, publicKey);
      try {
        const acc = await getAccount(connection, ata);
        return Number(acc.amount) / 10 ** WXRP_DECIMALS;
      } catch (e) {
        if (
          e instanceof TokenAccountNotFoundError ||
          e instanceof TokenInvalidAccountOwnerError
        ) {
          return 0;
        }
        throw e;
      }
    },
  });
}
