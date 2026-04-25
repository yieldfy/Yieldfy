import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { RPC_ENDPOINTS } from "@/env";

export type Cluster = "mainnet" | "devnet";

const STORAGE_KEY = "yieldfy:network";

type SolscanKind = "tx" | "account" | "token";

type NetworkContextValue = {
  network: Cluster;
  setNetwork: (n: Cluster) => void;
  endpoint: string;
  solscanUrl: (kind: SolscanKind, id: string) => string;
};

const NetworkContext = createContext<NetworkContextValue | null>(null);

const readInitial = (): Cluster => {
  if (typeof window === "undefined") return "mainnet";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "devnet" ? "devnet" : "mainnet";
};

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetworkState] = useState<Cluster>(readInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, network);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, [network]);

  const setNetwork = useCallback((n: Cluster) => setNetworkState(n), []);

  const endpoint = network === "mainnet" ? RPC_ENDPOINTS.mainnet : RPC_ENDPOINTS.devnet;

  const solscanUrl = useCallback(
    (kind: SolscanKind, id: string) => {
      const base = `https://solscan.io/${kind}/${id}`;
      return network === "devnet" ? `${base}?cluster=devnet` : base;
    },
    [network],
  );

  const value = useMemo<NetworkContextValue>(
    () => ({ network, setNetwork, endpoint, solscanUrl }),
    [network, setNetwork, endpoint, solscanUrl],
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used within NetworkProvider");
  return ctx;
}
