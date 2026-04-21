import { describe, it, expect, beforeAll } from "vitest";
import { BN } from "@coral-xyz/anchor";
import { SYSVAR_INSTRUCTIONS_PUBKEY, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
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

describe("rebalance", () => {
  let fx: Fixture;

  beforeAll(async () => {
    fx = await setup();
    const { userWxrp, userYxrp } = await fundUser(
      fx,
      fx.payer.publicKey,
      5_000_000n,
    );
    const slot = await currentSlot(fx);
    const { ix: edIx, sig } = edIxFor(fx.attestor, 0, slot);
    const [cfg] = configPda();
    const [pos] = positionPda(fx.payer.publicKey);
    const [vault] = vaultPda(fx.wxrpMint);

    await fx.program.methods
      .depositWxrpToKamino({
        amount: new BN(5_000_000),
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

  it("flips Position.venue with a valid attestation", async () => {
    const toVenue = 1; // marginfi
    const slot = await currentSlot(fx);
    const { ix: edIx, sig } = edIxFor(fx.attestor, toVenue, slot);

    const [cfg] = configPda();
    const [pos] = positionPda(fx.payer.publicKey);

    const before = await (fx.program.account as any).position.fetch(pos);
    expect(before.venue).toBe(0);

    await fx.program.methods
      .rebalance({
        targetVenue: toVenue,
        attestationSlot: new BN(slot.toString()),
        attestationSig: Array.from(sig),
      })
      .accounts({
        config: cfg,
        position: pos,
        ixSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        user: fx.payer.publicKey,
      })
      .preInstructions([edIx])
      .rpc();

    const after = await (fx.program.account as any).position.fetch(pos);
    expect(after.venue).toBe(toVenue);
    // Principal and receipt supply are bookkeeping — must stay unchanged.
    expect(after.principal.toString()).toBe(before.principal.toString());
    expect(after.receiptSupply.toString()).toBe(before.receiptSupply.toString());
  });

  it("rejects a rebalance back to the same venue", async () => {
    const [cfg] = configPda();
    const [pos] = positionPda(fx.payer.publicKey);
    const current = (await (fx.program.account as any).position.fetch(pos)).venue;
    const slot = await currentSlot(fx);
    const { ix: edIx, sig } = edIxFor(fx.attestor, current, slot);

    await expect(
      fx.program.methods
        .rebalance({
          targetVenue: current,
          attestationSlot: new BN(slot.toString()),
          attestationSig: Array.from(sig),
        })
        .accounts({
          config: cfg,
          position: pos,
          ixSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
          user: fx.payer.publicKey,
        })
        .preInstructions([edIx])
        .rpc(),
    ).rejects.toThrow();
  });
});
