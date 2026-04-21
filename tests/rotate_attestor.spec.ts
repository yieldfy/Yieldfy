import { describe, it, expect, beforeAll } from "vitest";
import { BankrunProvider, startAnchor } from "anchor-bankrun";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createMint } from "spl-token-bankrun";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const IDL = JSON.parse(
  readFileSync(resolve(here, "../packages/sdk/src/idl/yieldfy.json"), "utf8"),
);
const PROGRAM_ID = new PublicKey(IDL.address);

function configPda() {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
}
function vaultPda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), mint.toBuffer()],
    PROGRAM_ID,
  );
}

describe("rotate_attestor", () => {
  let provider: BankrunProvider;
  let program: Program;
  let payer: Keypair;
  let initialAttestor: Keypair;

  beforeAll(async () => {
    const ctx = await startAnchor(resolve(here, ".."), [], []);
    provider = new BankrunProvider(ctx);
    program = new Program(IDL as any, provider as unknown as AnchorProvider);
    payer = (provider.wallet as any).payer as Keypair;
    initialAttestor = Keypair.generate();

    const wxrpMint = await createMint(
      ctx.banksClient,
      payer,
      payer.publicKey,
      null,
      6,
    );
    const yxrpMint = await createMint(
      ctx.banksClient,
      payer,
      payer.publicKey,
      null,
      6,
    );

    const [cfgPda] = configPda();
    const [vault] = vaultPda(wxrpMint);

    await program.methods
      .initialize({
        attestor: initialAttestor.publicKey,
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
  });

  it("replaces Config.attestor", async () => {
    const [cfgPda] = configPda();
    const newAttestor = Keypair.generate();

    const before = await (program.account as any).config.fetch(cfgPda);
    expect(before.attestor.toBase58()).toBe(initialAttestor.publicKey.toBase58());

    await program.methods
      .rotateAttestor(newAttestor.publicKey)
      .accounts({ config: cfgPda, authority: payer.publicKey })
      .rpc();

    const after = await (program.account as any).config.fetch(cfgPda);
    expect(after.attestor.toBase58()).toBe(newAttestor.publicKey.toBase58());
  });

  it("rejects a non-authority signer", async () => {
    const imposter = Keypair.generate();
    const [cfgPda] = configPda();

    await expect(
      program.methods
        .rotateAttestor(Keypair.generate().publicKey)
        .accounts({ config: cfgPda, authority: imposter.publicKey })
        .signers([imposter])
        .rpc(),
    ).rejects.toThrow();
  });
});
