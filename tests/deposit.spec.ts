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

describe("deposit_wxrp_to_kamino", () => {
  let fx: Fixture;

  beforeAll(async () => {
    fx = await setup();
  });

  it("mints yXRP 1:1 and updates the Position PDA", async () => {
    const venue = 0; // kamino
    const amount = new BN(1_000_000);

    const { userWxrp, userYxrp } = await fundUser(
      fx,
      fx.payer.publicKey,
      BigInt(amount.toString()),
    );

    const slot = await currentSlot(fx);
    const { ix: edIx, sig } = edIxFor(fx.attestor, venue, slot);

    const [cfg] = configPda();
    const [pos] = positionPda(fx.payer.publicKey);
    const [vault] = vaultPda(fx.wxrpMint);

    await fx.program.methods
      .depositWxrpToKamino({
        amount,
        attestationSlot: new BN(slot.toString()),
        attestationSig: Array.from(sig),
        expectedVenue: venue,
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

    const receipt = await getAccount(fx.ctx.banksClient, userYxrp);
    expect(receipt.amount.toString()).toBe(amount.toString());

    const position = await (fx.program.account as any).position.fetch(pos);
    expect(position.principal.toString()).toBe(amount.toString());
    expect(position.receiptSupply.toString()).toBe(amount.toString());
    expect(position.venue).toBe(venue);
    expect(position.owner.toBase58()).toBe(fx.payer.publicKey.toBase58());
  });
});
