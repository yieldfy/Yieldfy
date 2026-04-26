/**
 * Reward claim flow: pulls the user's pending claim proof from the
 * rewards-indexer, builds the on-chain claim ix, sends via wallet-adapter
 * (signAndSendTransaction routing — same Phantom rule we apply to deposit).
 *
 * Disabled gracefully when env config is missing — UI shows preview state
 * instead. Becomes active once VITE_REWARDS_INDEXER_URL and
 * VITE_DISTRIBUTOR_PROGRAM_ID are populated post-launch.
 */

import { useCallback, useEffect, useState } from "react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  YieldfyDistributor,
  fetchClaimProof,
  type ClaimProof,
} from "@yieldfy/sdk";
import { env } from "@/env";

export type ClaimState =
  | { kind: "disabled"; reason: string }
  | { kind: "loading" }
  | { kind: "no-claim" }
  | { kind: "ready"; sol: number; epochId: number; proof: ClaimProof }
  | { kind: "claiming" }
  | { kind: "claimed"; sig: string }
  | { kind: "error"; message: string };

export function useRewardsClaim(): {
  state: ClaimState;
  claim: () => Promise<void>;
  refetch: () => Promise<void>;
} {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [state, setState] = useState<ClaimState>({ kind: "loading" });

  const indexerUrl = env.VITE_REWARDS_INDEXER_URL;
  const programIdRaw = env.VITE_DISTRIBUTOR_PROGRAM_ID;
  const distributorId = env.VITE_DISTRIBUTOR_ID;

  const enabled = Boolean(indexerUrl && programIdRaw && wallet.publicKey);

  const refetch = useCallback(async () => {
    if (!indexerUrl) {
      setState({ kind: "disabled", reason: "Rewards indexer not configured" });
      return;
    }
    if (!programIdRaw) {
      setState({ kind: "disabled", reason: "Distributor program not deployed" });
      return;
    }
    if (!wallet.publicKey) {
      setState({ kind: "disabled", reason: "Connect wallet to view rewards" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const proof = await fetchClaimProof(indexerUrl, wallet.publicKey.toBase58());
      if (!proof) {
        setState({ kind: "no-claim" });
        return;
      }
      setState({
        kind: "ready",
        sol: Number(proof.lamports) / LAMPORTS_PER_SOL,
        epochId: proof.epochId,
        proof,
      });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [indexerUrl, programIdRaw, wallet.publicKey]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const claim = useCallback(async () => {
    if (state.kind !== "ready") return;
    if (!programIdRaw || !wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return;

    setState({ kind: "claiming" });
    try {
      const provider = new AnchorProvider(
        connection,
        {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction.bind(wallet),
          signAllTransactions: wallet.signAllTransactions.bind(wallet),
        },
        { commitment: "confirmed" },
      );
      const programId = new PublicKey(programIdRaw);
      const distributor = new YieldfyDistributor(provider, programId);
      const sig = await distributor.claim({
        distributorId,
        proof: state.proof,
        sendTransaction: (tx, conn, opts) => wallet.sendTransaction(tx, conn, opts),
      });
      setState({ kind: "claimed", sig });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [state, connection, wallet, programIdRaw, distributorId]);

  return { state, claim, refetch };
}
