/**
 * Reward claim flow.
 *
 * Pulls the user's pending claim proof from the rewards-indexer
 * (GET /claim/:wallet), builds a Saber merkle-distributor claim ix, and sends
 * it via wallet-adapter's sendTransaction (signAndSendTransaction routing —
 * required by Phantom; see ops handoff §06).
 *
 * Disabled gracefully when:
 *   - VITE_REWARDS_INDEXER_URL is unset (preview state)
 *   - Wallet not connected
 *   - Indexer has no claim for this wallet in the latest epoch
 *   - Latest epoch has been computed off-chain but not yet published on-chain
 *     by the publisher (saberDistributor === null)
 */

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  ComputeBudgetProgram,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  NATIVE_MINT,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { buildSaberClaimIx } from "@yieldfy/sdk";
import { env } from "@/env";

interface SaberClaim {
  epochId: number;
  merkleRoot: string;
  /** Saber distributor PDA. Null until publisher has put the epoch on-chain. */
  saberDistributor: string | null;
  index: number;
  lamports: string;
  proof: string[];
}

export type ClaimState =
  | { kind: "disabled"; reason: string }
  | { kind: "loading" }
  | { kind: "no-claim" }
  | { kind: "ready"; sol: number; epochId: number; claim: SaberClaim }
  | { kind: "claiming" }
  | { kind: "claimed"; sig: string }
  | { kind: "error"; message: string };

async function fetchSaberClaim(
  indexerUrl: string,
  wallet: string,
): Promise<SaberClaim | null> {
  const url = `${indexerUrl.replace(/\/$/, "")}/claim/${wallet}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`indexer ${res.status} fetching ${url}`);
  return (await res.json()) as SaberClaim;
}

export function useRewardsClaim(): {
  state: ClaimState;
  claim: () => Promise<void>;
  refetch: () => Promise<void>;
} {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [state, setState] = useState<ClaimState>({ kind: "loading" });

  const indexerUrl = env.VITE_REWARDS_INDEXER_URL;

  const refetch = useCallback(async () => {
    if (!indexerUrl) {
      setState({ kind: "disabled", reason: "Rewards indexer not configured" });
      return;
    }
    if (!wallet.publicKey) {
      setState({ kind: "disabled", reason: "Connect wallet to view rewards" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const claim = await fetchSaberClaim(indexerUrl, wallet.publicKey.toBase58());
      if (!claim) {
        setState({ kind: "no-claim" });
        return;
      }
      if (!claim.saberDistributor) {
        setState({
          kind: "disabled",
          reason: "Epoch computed; awaiting on-chain publish",
        });
        return;
      }
      setState({
        kind: "ready",
        sol: Number(BigInt(claim.lamports)) / LAMPORTS_PER_SOL,
        epochId: claim.epochId,
        claim,
      });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [indexerUrl, wallet.publicKey]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const claim = useCallback(async () => {
    if (state.kind !== "ready") return;
    if (!wallet.publicKey || !state.claim.saberDistributor) return;

    setState({ kind: "claiming" });
    try {
      const claimant = wallet.publicKey;
      const distributor = new PublicKey(state.claim.saberDistributor);
      const userWsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, claimant);
      const distributorWsolAta = getAssociatedTokenAddressSync(
        NATIVE_MINT,
        distributor,
        true, // distributor PDA is off-curve
      );

      const tx = new Transaction();
      // Explicit ComputeBudget ixs so Phantom doesn't inject its own and shift
      // instruction indexes (handoff §06 — affects programs that read ix-sysvar
      // by absolute index).
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
      // Ensure user has a wSOL ATA (idempotent — no-op if already present).
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          claimant,
          userWsolAta,
          claimant,
          NATIVE_MINT,
        ),
      );
      tx.add(
        buildSaberClaimIx(
          {
            distributor,
            claimant,
            from: distributorWsolAta,
            to: userWsolAta,
          },
          {
            index: BigInt(state.claim.index),
            amount: BigInt(state.claim.lamports),
            proof: state.claim.proof,
          },
        ),
      );
      // Unwrap wSOL → native SOL by closing the user's wSOL ATA.
      tx.add(createCloseAccountInstruction(userWsolAta, claimant, claimant));

      const sig = await wallet.sendTransaction(tx, connection);
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: sig, ...latest },
        "confirmed",
      );
      setState({ kind: "claimed", sig });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [state, connection, wallet]);

  return { state, claim, refetch };
}
