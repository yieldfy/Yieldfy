import { describe, it, expect, beforeAll } from "vitest";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getAccount } from "spl-token-bankrun";
import {
  setup,
  fundUser,
  currentSlot,
  configPda,
  positionPda,
  vaultPda,
  edIxFor,
  KAMINO_PROGRAM_ID,
  type Fixture,
} from "./helpers.js";

describe("withdraw", () => {
  let fx: Fixture;
  let userWxrp: PublicKey;
  let userYxrp: PublicKey;
  const depositAmount = new BN(5_000_000);

  beforeAll(async () => {
    fx = await setup();
    ({ userWxrp, userYxrp } = await fundUser(
      fx,
      fx.payer.publicKey,
      BigInt(depositAmount.toString()),
    ));

    // Prime a position via deposit so withdraw has receipts to burn.
    const slot = await currentSlot(fx);
    const { ix: edIx, sig } = edIxFor(fx.attestor, 0, slot);
    const [cfg] = configPda();
    const [pos] = positionPda(fx.payer.publicKey);
    const [vault] = vaultPda(fx.wxrpMint);

    await fx.program.methods
      .depositWxrpToKamino({
        amount: depositAmount,
        attestationSlot: new BN(slot.toString()),
        attestationSig: Array.from(sig),
        expectedVenue: 0,
      })
      .accounts({
        config: cfg,
        position: pos,
        userWxrp,
        vaultWxrp: vault,
        yxrpMint: fx.yxrpMint,
        userYxrp,
        venueProgram: KAMINO_PROGRAM_ID,
        ixSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        user: fx.payer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([edIx])
      .rpc();
  });

  it("burns yXRP and returns wXRP; shrinks the position", async () => {
    const exitAmount = new BN(2_000_000);
    const [cfg] = configPda();
    const [pos] = positionPda(fx.payer.publicKey);
    const [vault] = vaultPda(fx.wxrpMint);

    const wxrpBefore = (await getAccount(fx.ctx.banksClient, userWxrp)).amount;
    const yxrpBefore = (await getAccount(fx.ctx.banksClient, userYxrp)).amount;

    await fx.program.methods
      .withdraw(exitAmount)
      .accounts({
        config: cfg,
        position: pos,
        yxrpMint: fx.yxrpMint,
        userYxrp,
        userWxrp,
        vaultWxrp: vault,
        user: fx.payer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const wxrpAfter = (await getAccount(fx.ctx.banksClient, userWxrp)).amount;
    const yxrpAfter = (await getAccount(fx.ctx.banksClient, userYxrp)).amount;

    expect((wxrpAfter - wxrpBefore).toString()).toBe(exitAmount.toString());
    expect((yxrpBefore - yxrpAfter).toString()).toBe(exitAmount.toString());

    const position = await (fx.program.account as any).position.fetch(pos);
    const expectedRemaining = BigInt(depositAmount.toString()) - BigInt(exitAmount.toString());
    expect(position.principal.toString()).toBe(expectedRemaining.toString());
    expect(position.receiptSupply.toString()).toBe(expectedRemaining.toString());
  });

  it("reverts with InsufficientBalance when exiting more than the position", async () => {
    const [cfg] = configPda();
    const [pos] = positionPda(fx.payer.publicKey);
    const [vault] = vaultPda(fx.wxrpMint);

    await expect(
      fx.program.methods
        .withdraw(new BN(999_999_999))
        .accounts({
          config: cfg,
          position: pos,
          yxrpMint: fx.yxrpMint,
          userYxrp,
          userWxrp,
          vaultWxrp: vault,
          user: fx.payer.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
    ).rejects.toThrow();
  });
});
