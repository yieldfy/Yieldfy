/**
 * Squads V4 publisher: turns one EpochResult into an on-chain Saber merkle
 * distributor by way of a Squads vault transaction proposal.
 *
 * The publisher only *creates the proposal*. Execution requires the Squads
 * 2-of-2 (member 1 cold + member 2 main) to approve in the Squads UI, which
 * happens out-of-band (typically Saturday morning before claims open). We
 * write the distributor PDA into EpochResult immediately on propose — the
 * address is deterministic from the multisig + transaction index + ephemeral
 * signer, so it's known before execution. Claims attempted before execution
 * fail with "AccountNotInitialized"; that's expected and surfaces as a clear
 * error in the dashboard claim hook.
 *
 * Pre-launch (empty pools) the publisher refuses with status "skipped".
 */

import { readFile } from "node:fs/promises";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import { buildSaberPublishBundle } from "./saber-bundle.js";
import { EpochStorage, type EpochResult } from "./storage.js";

export interface PublisherConfig {
  multisigPda: PublicKey;
  vaultIndex: number;
  proposer: Keypair;
}

export type PublishResult =
  | { status: "skipped"; reason: string }
  | {
      status: "proposed";
      transactionIndex: string;
      saberDistributor: string;
      saberDistributorBase: string;
      proposeSig: string;
    };

export async function publishEpochToSaber(args: {
  conn: Connection;
  epoch: EpochResult;
  storage: EpochStorage;
  config: PublisherConfig;
}): Promise<PublishResult> {
  if (args.epoch.saberDistributor) {
    return { status: "skipped", reason: "already published" };
  }
  if (
    args.epoch.totalLamports === "0" ||
    Object.keys(args.epoch.claims).length === 0
  ) {
    return { status: "skipped", reason: "empty pool" };
  }

  const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
    args.conn,
    args.config.multisigPda,
  );
  const transactionIndex = BigInt(multisigInfo.transactionIndex.toString()) + 1n;

  const [vaultPda] = multisig.getVaultPda({
    multisigPda: args.config.multisigPda,
    index: args.config.vaultIndex,
  });
  const [transactionPda] = multisig.getTransactionPda({
    multisigPda: args.config.multisigPda,
    index: transactionIndex,
  });
  const [ephemeralBase] = multisig.getEphemeralSignerPda({
    transactionPda,
    ephemeralSignerIndex: 0,
  });

  const bundle = buildSaberPublishBundle({
    vaultPda,
    ephemeralBase,
    epoch: args.epoch,
  });

  // Squads compiles + serializes the inner message; recentBlockhash is replaced
  // at execute time. Any valid blockhash works for the compile step.
  const { blockhash } = await args.conn.getLatestBlockhash("confirmed");
  const innerMessage = new TransactionMessage({
    payerKey: vaultPda,
    recentBlockhash: blockhash,
    instructions: bundle.ixs,
  });

  const createTxIx = multisig.instructions.vaultTransactionCreate({
    multisigPda: args.config.multisigPda,
    transactionIndex,
    creator: args.config.proposer.publicKey,
    vaultIndex: args.config.vaultIndex,
    ephemeralSigners: 1,
    transactionMessage: innerMessage,
    memo: `yieldfy-rewards epoch ${args.epoch.epochId}`,
  });
  const createProposalIx = multisig.instructions.proposalCreate({
    multisigPda: args.config.multisigPda,
    transactionIndex,
    creator: args.config.proposer.publicKey,
  });

  const outerTx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: args.config.proposer.publicKey,
      recentBlockhash: blockhash,
      instructions: [createTxIx, createProposalIx],
    }).compileToV0Message(),
  );
  outerTx.sign([args.config.proposer]);

  const sig = await args.conn.sendTransaction(outerTx);
  const latest = await args.conn.getLatestBlockhash();
  await args.conn.confirmTransaction(
    { signature: sig, ...latest },
    "confirmed",
  );

  const updated: EpochResult = {
    ...args.epoch,
    saberDistributor: bundle.distributorPda.toBase58(),
    saberDistributorBase: ephemeralBase.toBase58(),
    saberPublishedAt: Date.now(),
  };
  await args.storage.write(updated);

  return {
    status: "proposed",
    transactionIndex: transactionIndex.toString(),
    saberDistributor: bundle.distributorPda.toBase58(),
    saberDistributorBase: ephemeralBase.toBase58(),
    proposeSig: sig,
  };
}

/**
 * Load the proposer Keypair from either SQUADS_PROPOSER_KEYPAIR_PATH (file)
 * or SQUADS_PROPOSER_KEYPAIR_JSON (inline 64-byte array).
 */
export async function loadProposerKeypair(args: {
  path?: string;
  inlineJson?: string;
}): Promise<Keypair> {
  let raw: string | undefined;
  if (args.path) {
    raw = await readFile(args.path, "utf-8");
  } else if (args.inlineJson) {
    raw = args.inlineJson;
  } else {
    throw new Error(
      "saber-publisher: SQUADS_PROPOSER_KEYPAIR_PATH or SQUADS_PROPOSER_KEYPAIR_JSON must be set",
    );
  }
  const bytes = JSON.parse(raw) as unknown;
  if (!Array.isArray(bytes) || bytes.length !== 64) {
    throw new Error(
      "saber-publisher: proposer keypair must be a 64-element byte array",
    );
  }
  return Keypair.fromSecretKey(Uint8Array.from(bytes as number[]));
}
