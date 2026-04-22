/**
 * DepositFlow — minimal React example of depositing wXRP via @yieldfy/sdk.
 *
 * Copy this file into your own Vite + React app. It expects a
 * ConnectionProvider + WalletProvider from @solana/wallet-adapter-react
 * to be mounted above it.
 */

import { useCallback, useState } from "react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { Yieldfy, fetchAttestation, VENUE_CODE } from "@yieldfy/sdk";

type Props = {
  programId: string;
  optimizerUrl: string;
  /** Amount of wXRP to deposit, in base units (6 decimals). Defaults to 10 wXRP. */
  amount?: bigint;
};

export function DepositFlow({ programId, optimizerUrl, amount = 10_000_000n }: Props) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [status, setStatus] = useState<string>("idle");
  const [txSig, setTxSig] = useState<string | null>(null);

  const onDeposit = useCallback(async () => {
    if (!wallet) {
      setStatus("connect a wallet first");
      return;
    }
    try {
      setStatus("fetching attestation…");
      const attestation = await fetchAttestation(optimizerUrl);

      setStatus("submitting deposit…");
      const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
      });
      const sdk = new Yieldfy(provider, new PublicKey(programId));

      const sig = await sdk.deposit(
        { amount, expectedVenue: VENUE_CODE.kamino },
        attestation,
      );

      setTxSig(sig);
      setStatus("done");
    } catch (err) {
      setStatus(`error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [wallet, connection, programId, optimizerUrl, amount]);

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
      <h2>Deposit wXRP → receive yXRP</h2>

      <button onClick={onDeposit} disabled={!wallet || status.startsWith("…")}>
        Deposit {Number(amount) / 1_000_000} wXRP
      </button>

      <p>Status: {status}</p>

      {txSig && (
        <a
          href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
        >
          View transaction on Solana Explorer
        </a>
      )}
    </div>
  );
}
