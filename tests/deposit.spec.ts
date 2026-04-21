import { describe, it, expect, beforeAll } from "vitest";
import { BankrunProvider, startAnchor } from "anchor-bankrun";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import {
  Ed25519Program,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  setAuthority,
  AuthorityType,
  getAccount,
} from "@solana/spl-token";
import nacl from "tweetnacl";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Hand-authored IDL in @yieldfy/sdk matches what `anchor build` emits; the
// runtime programId is overridden below so discriminators are what matter.
const here = dirname(fileURLToPath(import.meta.url));
const IDL = JSON.parse(
  readFileSync(
    resolve(here, "../packages/sdk/src/idl/yieldfy.json"),
    "utf8",
  ),
);

// Matches declare_id! in programs/yieldfy/src/lib.rs
const PROGRAM_ID = new PublicKey(
  "CNGH7jZbLHJDTWSz5XnbZ5o4QBWQxph6qGWKRe1y6SNK",
);

function configPda() {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
}
function positionPda(user: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), user.toBuffer()],
    PROGRAM_ID,
  );
}
function vaultPda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), mint.toBuffer()],
    PROGRAM_ID,
  );
}

function buildMessage(venue: number, slot: bigint): Buffer {
  const buf = Buffer.alloc(9);
  buf.writeUInt8(venue, 0);
  buf.writeBigUInt64LE(slot, 1);
  return buf;
}

describe("deposit_wxrp_to_kamino", () => {
  let provider: BankrunProvider;
  let program: Program;
  let payer: Keypair;
  let attestor: Keypair;
  let wxrpMint: PublicKey;
  let yxrpMint: PublicKey;

  beforeAll(async () => {
    const ctx = await startAnchor("./programs/yieldfy", [], []);
    provider = new BankrunProvider(ctx);
    program = new Program(
      { ...IDL, address: PROGRAM_ID.toBase58() } as any,
      provider as unknown as AnchorProvider,
    );
    payer = (provider.wallet as any).payer as Keypair;
    attestor = Keypair.generate();

    // Create wXRP + yXRP mints (payer is initial authority; we'll transfer
    // yxrp authority to the Config PDA after initialize).
    wxrpMint = await createMint(
      provider.connection as any,
      payer,
      payer.publicKey,
      null,
      6,
    );
    yxrpMint = await createMint(
      provider.connection as any,
      payer,
      payer.publicKey,
      null,
      6,
    );

    const [cfgPda] = configPda();
    const [vault] = vaultPda(wxrpMint);

    await program.methods
      .initialize({
        attestor: attestor.publicKey,
        maxSingleDeposit: new BN(1_000_000_000),
        stalenessSlots: new BN(150),
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

    // yXRP mint authority → Config PDA so the program can mint receipts.
    await setAuthority(
      provider.connection as any,
      payer,
      yxrpMint,
      payer.publicKey,
      AuthorityType.MintTokens,
      cfgPda,
    );
  });

  it("mints yXRP 1:1 and updates position on deposit", async () => {
    const venue = 0; // kamino
    const amount = new BN(1_000_000);

    const userWxrp = await createAssociatedTokenAccount(
      provider.connection as any,
      payer,
      wxrpMint,
      payer.publicKey,
    );
    await mintTo(
      provider.connection as any,
      payer,
      wxrpMint,
      userWxrp,
      payer,
      amount.toNumber(),
    );
    const userYxrp = await createAssociatedTokenAccount(
      provider.connection as any,
      payer,
      yxrpMint,
      payer.publicKey,
    );

    const slot = await provider.connection.getSlot();
    const slotBig = BigInt(slot);
    const msg = buildMessage(venue, slotBig);
    const sig = nacl.sign.detached(msg, attestor.secretKey);

    const edIx = Ed25519Program.createInstructionWithPublicKey({
      publicKey: attestor.publicKey.toBytes(),
      message: msg,
      signature: sig,
    });

    const [cfgPda] = configPda();
    const [posPda] = positionPda(payer.publicKey);
    const [vault] = vaultPda(wxrpMint);

    await program.methods
      .depositWxrpToKamino({
        amount,
        attestationSlot: new BN(slot),
        attestationSig: Array.from(sig),
        expectedVenue: venue,
      })
      .accounts({
        config: cfgPda,
        position: posPda,
        userWxrp,
        vaultWxrp: vault,
        yxrpMint,
        userYxrp,
        venueProgram: new PublicKey(
          "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
        ),
        ixSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        user: payer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([edIx])
      .rpc();

    const receipt = await getAccount(provider.connection as any, userYxrp);
    expect(receipt.amount).toBe(BigInt(amount.toString()));

    const position = await (program.account as any).position.fetch(posPda);
    expect(position.principal.toString()).toBe(amount.toString());
    expect(position.receiptSupply.toString()).toBe(amount.toString());
    expect(position.venue).toBe(venue);
    expect(position.owner.toBase58()).toBe(payer.publicKey.toBase58());
  });
});
