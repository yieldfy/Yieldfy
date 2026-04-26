import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import IDL from "./idl/yieldfy.json";
import { buildAttestationPreIx } from "./attestation.js";
import {
  IX_SYSVAR,
  KAMINO_PROGRAM_ID,
  findConfigPda,
  findPositionPda,
  findVaultPda,
} from "./pdas.js";
import {
  VENUE_FROM_CODE,
  type Attestation,
  type ConfigAccount,
  type DepositParams,
  type PositionAccount,
} from "./types.js";

/** @yieldfy/sdk version — bumped in CHANGELOG + package.json together. */
export const SDK_VERSION = "0.0.1";

const bnToBigint = (v: { toString(): string }) => BigInt(v.toString());

export class Yieldfy {
  readonly program: Program;
  readonly configPda: PublicKey;

  constructor(
    public readonly provider: AnchorProvider,
    public readonly programId: PublicKey,
  ) {
    // Clone the IDL and override its address with the caller-supplied
    // programId — anchor build emits a fixed address we replace at runtime.
    const idl = JSON.parse(JSON.stringify(IDL)) as Idl & { address: string };
    idl.address = programId.toBase58();
    this.program = new Program(idl, provider);
    [this.configPda] = findConfigPda(programId);
  }

  /** Deterministic, network-free PDA helpers. */
  findPositionPda(user: PublicKey): [PublicKey, number] {
    return findPositionPda(user, this.programId);
  }
  findVaultPda(mint: PublicKey): [PublicKey, number] {
    return findVaultPda(mint, this.programId);
  }

  async fetchConfig(): Promise<ConfigAccount> {
    // Account names in the IDL are PascalCase ("Config"); anchor exposes them
    // as camelCase on program.account, so cast to a loose shape.
    const accounts = this.program.account as unknown as {
      config: { fetch(addr: PublicKey): Promise<Record<string, unknown>> };
    };
    const raw = await accounts.config.fetch(this.configPda);
    return {
      authority: raw.authority as PublicKey,
      wxrpMint: raw.wxrpMint as PublicKey,
      yxrpMint: raw.yxrpMint as PublicKey,
      attestor: raw.attestor as PublicKey,
      maxSingleDeposit: bnToBigint(raw.maxSingleDeposit as BN),
      stalenessSlots: bnToBigint(raw.stalenessSlots as BN),
      paused: raw.paused as boolean,
      bump: raw.bump as number,
    };
  }

  async readPosition(user: PublicKey): Promise<PositionAccount | null> {
    const [pda] = this.findPositionPda(user);
    const accounts = this.program.account as unknown as {
      position: { fetch(addr: PublicKey): Promise<Record<string, unknown>> };
    };
    try {
      const raw = await accounts.position.fetch(pda);
      const venueCode = raw.venue as number;
      return {
        owner: raw.owner as PublicKey,
        venue: VENUE_FROM_CODE[venueCode],
        venueCode,
        principal: bnToBigint(raw.principal as BN),
        receiptSupply: bnToBigint(raw.receiptSupply as BN),
        lastUpdate: bnToBigint(raw.lastUpdate as BN),
        bump: raw.bump as number,
      };
    } catch {
      return null; // PDA hasn't been initialized yet
    }
  }

  /**
   * Deposit wXRP, routed via the optimizer's signed attestation. Returns the tx
   * signature. Requires the wallet on `provider` to sign.
   */
  async deposit(p: DepositParams, att: Attestation): Promise<string> {
    const user = this.provider.wallet.publicKey;
    const cfg = await this.fetchConfig();
    const [positionPda] = this.findPositionPda(user);
    const [vaultWxrp] = this.findVaultPda(cfg.wxrpMint);
    const userWxrp = getAssociatedTokenAddressSync(cfg.wxrpMint, user);
    const userYxrp = getAssociatedTokenAddressSync(cfg.yxrpMint, user);

    // First-time depositors don't yet have a yXRP token account. The on-chain
    // deposit IX expects `user_yxrp` to be initialized, so create it
    // idempotently (no-op when it already exists) as a pre-instruction.
    const ataIx = createAssociatedTokenAccountIdempotentInstruction(
      user,
      userYxrp,
      user,
      cfg.yxrpMint,
    );

    const edIx: TransactionInstruction = buildAttestationPreIx(att);

    // attest::verify hardcodes ix index 0 for the ed25519 precompile. Phantom
    // auto-prepends ComputeBudget priority-fee ixs at signing time when the
    // tx contains none, which would shift ed25519 off index 0. Including our
    // own setComputeUnitLimit + setComputeUnitPrice (after edIx) suppresses
    // Phantom's injection while keeping ed25519 at index 0.
    const cbLimitIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 });
    const cbPriceIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 });

    const methods = this.program.methods as unknown as {
      depositWxrpToKamino(args: {
        amount: BN;
        attestationSlot: BN;
        attestationSig: number[];
        expectedVenue: number;
      }): {
        accounts(a: Record<string, PublicKey>): {
          preInstructions(ix: TransactionInstruction[]): { rpc(): Promise<string> };
        };
      };
    };

    return methods
      .depositWxrpToKamino({
        amount: new BN(p.amount.toString()),
        attestationSlot: new BN(att.slot),
        attestationSig: Array.from(Buffer.from(att.sigHex, "hex")),
        expectedVenue: att.venueCode,
      })
      .accounts({
        config: this.configPda,
        position: positionPda,
        userWxrp,
        vaultWxrp,
        yxrpMint: cfg.yxrpMint,
        userYxrp,
        venueProgram: KAMINO_PROGRAM_ID,
        ixSysvar: IX_SYSVAR,
        user,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([edIx, cbLimitIx, cbPriceIx, ataIx])
      .rpc();
  }

  /** Withdraw wXRP. No attestation required (users can always exit — §07). */
  async withdraw(amount: bigint): Promise<string> {
    const user = this.provider.wallet.publicKey;
    const cfg = await this.fetchConfig();
    const [positionPda] = this.findPositionPda(user);
    const [vaultWxrp] = this.findVaultPda(cfg.wxrpMint);
    const userWxrp = getAssociatedTokenAddressSync(cfg.wxrpMint, user);
    const userYxrp = getAssociatedTokenAddressSync(cfg.yxrpMint, user);

    const methods = this.program.methods as unknown as {
      withdraw(amount: BN): {
        accounts(a: Record<string, PublicKey>): { rpc(): Promise<string> };
      };
    };

    return methods
      .withdraw(new BN(amount.toString()))
      .accounts({
        config: this.configPda,
        position: positionPda,
        yxrpMint: cfg.yxrpMint,
        userYxrp,
        userWxrp,
        vaultWxrp,
        user,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }
}
