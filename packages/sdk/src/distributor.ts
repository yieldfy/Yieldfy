/**
 * Client for the yieldfy_distributor Anchor program — Phase 2 SOL claim flow.
 *
 * The off-chain rewards-indexer publishes per-wallet merkle proofs at
 * `/claim/:wallet`. This module turns one of those proofs into a `claim`
 * instruction the dashboard can sign and send.
 */

import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  type Connection,
  type SendOptions,
  type TransactionInstruction,
} from "@solana/web3.js";
import IDL from "./idl/yieldfy_distributor.json";

export const DISTRIBUTOR_SEED = Buffer.from("distributor");
export const TREASURY_SEED = Buffer.from("treasury");
export const CLAIM_SEED = Buffer.from("claim");

export interface ClaimProof {
  /** Epoch the proof is for. Must match `Distributor.current_epoch_id` on-chain. */
  epochId: number;
  /** Leaf index inside the merkle tree. Locked at indexer publish time. */
  index: number;
  /** Hex-encoded keccak siblings, root-direction. */
  proof: string[];
  /** Lamports awarded to the claimant. */
  lamports: bigint;
}

export type SendTransactionFn = (
  tx: Transaction,
  connection: Connection,
  options?: SendOptions,
) => Promise<string>;

export class YieldfyDistributor {
  readonly program: Program;

  constructor(
    public readonly provider: AnchorProvider,
    public readonly programId: PublicKey,
  ) {
    const idl = JSON.parse(JSON.stringify(IDL)) as Idl & { address: string };
    idl.address = programId.toBase58();
    this.program = new Program(idl, provider);
  }

  /** Distributor PDA: ["distributor", distributor_id_le] */
  findDistributorPda(distributorId: bigint): [PublicKey, number] {
    const idBuf = Buffer.alloc(8);
    idBuf.writeBigUInt64LE(distributorId, 0);
    return PublicKey.findProgramAddressSync([DISTRIBUTOR_SEED, idBuf], this.programId);
  }

  /** Treasury PDA: ["treasury", distributor_pda] */
  findTreasuryPda(distributor: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [TREASURY_SEED, distributor.toBuffer()],
      this.programId,
    );
  }

  /** ClaimStatus PDA: ["claim", distributor_pda, epoch_id_le, index_le] */
  findClaimStatusPda(
    distributor: PublicKey,
    epochId: number | bigint,
    index: number,
  ): [PublicKey, number] {
    const epochBuf = Buffer.alloc(8);
    epochBuf.writeBigUInt64LE(BigInt(epochId), 0);
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32LE(index, 0);
    return PublicKey.findProgramAddressSync(
      [CLAIM_SEED, distributor.toBuffer(), epochBuf, indexBuf],
      this.programId,
    );
  }

  /**
   * Build a `claim` instruction. Caller wraps it in a Transaction and
   * sends via wallet-adapter's sendTransaction (signAndSendTransaction
   * routing — same Phantom rule as deposit).
   */
  async buildClaimIx(args: {
    distributorId: bigint;
    proof: ClaimProof;
    claimant: PublicKey;
  }): Promise<TransactionInstruction> {
    const [distributor] = this.findDistributorPda(args.distributorId);
    const [treasury] = this.findTreasuryPda(distributor);
    const [claimStatus] = this.findClaimStatusPda(
      distributor,
      args.proof.epochId,
      args.proof.index,
    );

    const proofBytes = args.proof.proof.map((hex) =>
      Array.from(Buffer.from(hex.startsWith("0x") ? hex.slice(2) : hex, "hex")),
    );

    const methods = this.program.methods as unknown as {
      claim(
        epochId: BN,
        index: number,
        amount: BN,
        proof: number[][],
      ): {
        accounts(a: Record<string, PublicKey>): {
          instruction(): Promise<TransactionInstruction>;
        };
      };
    };

    return methods
      .claim(
        new BN(args.proof.epochId),
        args.proof.index,
        new BN(args.proof.lamports.toString()),
        proofBytes,
      )
      .accounts({
        distributor,
        treasury,
        claimStatus,
        claimant: args.claimant,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  /**
   * Convenience: build the tx, send it via the caller's sendTransaction,
   * and return the signature once confirmed.
   */
  async claim(args: {
    distributorId: bigint;
    proof: ClaimProof;
    sendTransaction: SendTransactionFn;
  }): Promise<string> {
    const claimant = this.provider.wallet.publicKey;
    const ix = await this.buildClaimIx({
      distributorId: args.distributorId,
      proof: args.proof,
      claimant,
    });
    const tx = new Transaction().add(ix);
    const { connection } = this.provider;
    const sig = await args.sendTransaction(tx, connection);
    const latest = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      { signature: sig, ...latest },
      "confirmed",
    );
    return sig;
  }
}

/** Hit the rewards-indexer's `/claim/:wallet` endpoint. */
export async function fetchClaimProof(
  indexerUrl: string,
  wallet: string,
): Promise<ClaimProof | null> {
  const url = `${indexerUrl.replace(/\/$/, "")}/claim/${wallet}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`indexer ${res.status} fetching ${url}`);
  const body = (await res.json()) as {
    epochId: number;
    index: number;
    lamports: string;
    proof: string[];
  };
  return {
    epochId: body.epochId,
    index: body.index,
    proof: body.proof,
    lamports: BigInt(body.lamports),
  };
}
