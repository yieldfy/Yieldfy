/**
 * useWalletGuard — defends an authenticated route (the dashboard) against
 * the user silently switching wallets in their extension. The contract:
 *
 *   1. Snapshot the address that was active when the dashboard mounted.
 *   2. If `useWallet().publicKey` ever drifts off that snapshot, redirect
 *      to `/` with a hard navigation (forces a state-clearing reload) and
 *      drop a one-shot message into sessionStorage so the landing page can
 *      surface a toast.
 *   3. Subscribe to the underlying provider's `accountChanged` /
 *      `disconnect` events as a faster signal than wallet-adapter's polling.
 *   4. Poll once a second as a backup for providers that don't fire events
 *      reliably (e.g. older Solflare builds).
 *
 * Pattern adapted from sorrowzzz/quiverterminal's useWalletGuard.
 */
import { useCallback, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

const DISCONNECT_MESSAGE_KEY = "yieldfy_disconnect_message";

type ProviderLike = {
  isConnected?: boolean;
  publicKey?: { toString(): string } | null;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler: (...args: unknown[]) => void) => void;
  disconnect?: () => Promise<void>;
};

const getPhantom = (): ProviderLike | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    phantom?: { solana?: ProviderLike & { isPhantom?: boolean } };
    solana?: ProviderLike & { isPhantom?: boolean };
  };
  const provider = w.phantom?.solana ?? w.solana;
  return provider?.isPhantom ? provider : null;
};

const getSolflare = (): ProviderLike | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { solflare?: ProviderLike & { isSolflare?: boolean } };
  const provider = w.solflare;
  return provider?.isSolflare ? provider : null;
};

export function useWalletGuard(): { handleDisconnect: () => Promise<void> } {
  const { publicKey, connected, disconnect, wallet } = useWallet();
  const initialAddressRef = useRef<string | null>(null);
  const handledRef = useRef(false);

  const clearAndRedirect = useCallback(
    async (message: string) => {
      if (handledRef.current) return;
      handledRef.current = true;

      if (typeof window !== "undefined") {
        sessionStorage.setItem(DISCONNECT_MESSAGE_KEY, message);
      }
      try {
        await disconnect();
      } catch (err) {
        console.error("[WalletGuard] disconnect error:", err);
      }
      // Hard navigation so React state, react-query cache, and any
      // in-flight tx UI is fully reset.
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.href = "/";
      }
    },
    [disconnect],
  );

  // 1. Track the address from wallet-adapter directly.
  useEffect(() => {
    if (connected && publicKey) {
      const address = publicKey.toBase58();
      if (!initialAddressRef.current) {
        initialAddressRef.current = address;
        handledRef.current = false;
      } else if (initialAddressRef.current !== address) {
        clearAndRedirect(
          "You switched to a different wallet. Please reconnect to continue.",
        );
      }
    } else if (!connected) {
      initialAddressRef.current = null;
    }
  }, [connected, publicKey, clearAndRedirect]);

  // 2. Subscribe to provider events.
  useEffect(() => {
    if (!connected || !publicKey) return;

    const currentAddress = publicKey.toBase58();
    const walletName = wallet?.adapter?.name?.toLowerCase() ?? "";
    const provider = walletName.includes("phantom")
      ? getPhantom()
      : walletName.includes("solflare")
        ? getSolflare()
        : (getPhantom() ?? getSolflare());

    if (!provider?.on) return;

    const handleDisconnect = () => {
      clearAndRedirect("Your wallet has been disconnected.");
    };

    const handleAccountChanged = (newPubkey: unknown) => {
      if (newPubkey == null) {
        clearAndRedirect("Your wallet has been disconnected.");
        return;
      }
      const newAddress =
        typeof newPubkey === "object" && newPubkey !== null && "toString" in newPubkey
          ? (newPubkey as { toString: () => string }).toString()
          : String(newPubkey);
      if (newAddress !== currentAddress) {
        clearAndRedirect(
          "You switched to a different wallet. Please reconnect to continue.",
        );
      }
    };

    provider.on("disconnect", handleDisconnect);
    provider.on("accountChanged", handleAccountChanged);

    return () => {
      provider.off?.("disconnect", handleDisconnect);
      provider.off?.("accountChanged", handleAccountChanged);
    };
  }, [connected, publicKey, wallet, clearAndRedirect]);

  // 3. Poll as a backup.
  useEffect(() => {
    if (!connected || !publicKey) return;

    const currentAddress = publicKey.toBase58();
    const walletName = wallet?.adapter?.name?.toLowerCase() ?? "";

    const interval = setInterval(() => {
      const provider = walletName.includes("phantom")
        ? getPhantom()
        : walletName.includes("solflare")
          ? getSolflare()
          : (getPhantom() ?? getSolflare());

      if (!provider) {
        clearAndRedirect("Your wallet connection was lost. Please reconnect.");
        return;
      }
      if (provider.isConnected === false) {
        clearAndRedirect("Your wallet has been disconnected.");
        return;
      }
      const providerAddress = provider.publicKey?.toString();
      if (providerAddress && providerAddress !== currentAddress) {
        clearAndRedirect(
          "You switched to a different wallet. Please reconnect to continue.",
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [connected, publicKey, wallet, clearAndRedirect]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error("[WalletGuard] manual disconnect error:", err);
    }
    await clearAndRedirect("You have been disconnected.");
  }, [disconnect, clearAndRedirect]);

  return { handleDisconnect };
}

/**
 * Pulls (and clears) the one-shot disconnect message left by the guard so
 * the landing page can render a toast on the next mount.
 */
export function consumeDisconnectMessage(): string | null {
  if (typeof window === "undefined") return null;
  const msg = sessionStorage.getItem(DISCONNECT_MESSAGE_KEY);
  if (msg) sessionStorage.removeItem(DISCONNECT_MESSAGE_KEY);
  return msg;
}

export default useWalletGuard;
