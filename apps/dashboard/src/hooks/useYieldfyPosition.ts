import { useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { useYieldfyClient } from "./useYieldfyClient";

export function useYieldfyPosition() {
  const { publicKey } = useWallet();
  const clientState = useYieldfyClient();

  return useQuery({
    queryKey: [
      "yieldfy-position",
      publicKey?.toBase58(),
      clientState.kind === "ready" ? "ready" : clientState.kind,
    ],
    enabled: !!publicKey && clientState.kind === "ready",
    staleTime: 30_000,
    queryFn: async () => {
      if (!publicKey || clientState.kind !== "ready") return null;
      return clientState.client.readPosition(publicKey);
    },
  });
}
