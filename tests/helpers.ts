import { BankrunProvider, startAnchor } from "anchor-bankrun";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  Ed25519Program,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createSetAuthorityInstruction,
  AuthorityType,
} from "@solana/spl-token";
import { createMint, mintTo, createAssociatedTokenAccount } from "spl-token-bankrun";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import nacl from "tweetnacl";

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, "..");

export const IDL = JSON.parse(
  readFileSync(resolve(REPO_ROOT, "packages/sdk/src/idl/yieldfy.json"), "utf8"),
);
export const PROGRAM_ID = new PublicKey(IDL.address);
export const KAMINO_PROGRAM_ID = new PublicKey(
  "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
);

export function configPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
}
export function positionPda(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), user.toBuffer()],
    PROGRAM_ID,
  );
}
export function vaultPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), mint.toBuffer()],
    PROGRAM_ID,
  );
}

export function attestationMessage(venue: number, slot: bigint): Buffer {
  const buf = Buffer.alloc(9);
  buf.writeUInt8(venue, 0);
  buf.writeBigUInt64LE(slot, 1);
  return buf;
}

export function edIxFor(attestor: Keypair, venue: number, slot: bigint) {
  const msg = attestationMessage(venue, slot);
  const sig = nacl.sign.detached(msg, attestor.secretKey);
  const ix = Ed25519Program.createInstructionWithPublicKey({
    publicKey: attestor.publicKey.toBytes(),
    message: msg,
    signature: sig,
  });
  return { ix, sig };
}

export type Fixture = {
  ctx: Awaited<ReturnType<typeof startAnchor>>;
  provider: BankrunProvider;
  program: Program;
  payer: Keypair;
  attestor: Keypair;
  wxrpMint: PublicKey;
  yxrpMint: PublicKey;
};

/**
 * One-call fixture that boots bankrun, creates wXRP + yXRP mints, runs
 * `initialize`, and transfers the yXRP mint authority to the Config PDA so
 * subsequent deposits can mint receipts.
 */
export async function setup(opts: {
  maxSingleDeposit?: bigint;
  stalenessSlots?: bigint;
} = {}): Promise<Fixture> {
  const ctx = await startAnchor(REPO_ROOT, [], []);
  const provider = new BankrunProvider(ctx);
  const program = new Program(IDL as any, provider as unknown as AnchorProvider);
  const payer = (provider.wallet as any).payer as Keypair;
  const attestor = Keypair.generate();

  const [cfgPda] = configPda();

  // wXRP: payer holds mint authority so the test can fund user wallets.
  const wxrpMint = await createMint(
    ctx.banksClient,
    payer,
    payer.publicKey,
    null,
    6,
  );
  // yXRP: payer creates, program takes authority below.
  const yxrpMint = await createMint(
    ctx.banksClient,
    payer,
    payer.publicKey,
    null,
    6,
  );
  const [vault] = vaultPda(wxrpMint);

  await program.methods
    .initialize({
      attestor: attestor.publicKey,
      maxSingleDeposit: new BN((opts.maxSingleDeposit ?? 1_000_000_000n).toString()),
      stalenessSlots: new BN((opts.stalenessSlots ?? 150n).toString()),
    })
    .accounts({
      config: cfgPda,
      wxrpMint,
      yxrpMint,
      vaultWxrp: vault,
      authority: payer.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  // Hand yXRP mint authority to the Config PDA via a raw spl-token
  // SetAuthority instruction submitted through banksClient.
  const setAuth = createSetAuthorityInstruction(
    yxrpMint,
    payer.publicKey,
    AuthorityType.MintTokens,
    cfgPda,
  );
  const latestBlockhash = ctx.lastBlockhash;
  const tx = new Transaction({
    feePayer: payer.publicKey,
    blockhash: latestBlockhash,
    lastValidBlockHeight: 1_000_000,
  }).add(setAuth);
  tx.sign(payer);
  await ctx.banksClient.processTransaction(tx);

  return { ctx, provider, program, payer, attestor, wxrpMint, yxrpMint };
}

/** Create user ATAs for wXRP + yXRP and pre-fund wXRP from payer. */
export async function fundUser(
  fx: Fixture,
  user: PublicKey,
  wxrpAmount: bigint,
): Promise<{ userWxrp: PublicKey; userYxrp: PublicKey }> {
  const userWxrp = await createAssociatedTokenAccount(
    fx.ctx.banksClient,
    fx.payer,
    fx.wxrpMint,
    user,
  );
  const userYxrp = await createAssociatedTokenAccount(
    fx.ctx.banksClient,
    fx.payer,
    fx.yxrpMint,
    user,
  );
  await mintTo(
    fx.ctx.banksClient,
    fx.payer,
    fx.wxrpMint,
    userWxrp,
    fx.payer,
    Number(wxrpAmount),
  );
  return { userWxrp, userYxrp };
}

/** Read the on-chain slot via banksClient. */
export async function currentSlot(fx: Fixture): Promise<bigint> {
  const slot = await fx.ctx.banksClient.getSlot();
  return BigInt(slot.toString());
}
