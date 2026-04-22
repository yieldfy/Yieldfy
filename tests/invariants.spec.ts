/**
 * invariants.spec.ts — property-style coverage keyed to the eight security
 * invariants enumerated in AUDIT.md.
 *
 *  I3: Deposit cap — boundary: `amount == cap` succeeds, `amount == cap + 1`
 *      reverts with CapExceeded.
 *  I4: Pause never blocks withdraw — user can always exit.
 *  I5: 1:1 receipt round-trip — deposit N then withdraw N leaves
 *      position.principal == 0 and position.receipt_supply == 0.
 *  I7: Position uniqueness — two consecutive deposits by the same user
 *      accumulate into the same Position PDA, never reset.
 */
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

async function deposit(
  fx: Fixture,
  amount: bigint,
  userWxrp: PublicKey,
  userYxrp: PublicKey,
) {
  const slot = await currentSlot(fx);
  const { ix: edIx, sig } = edIxFor(fx.attestor, 0, slot);
  const [cfg] = configPda();
  const [pos] = positionPda(fx.payer.publicKey);
  const [vault] = vaultPda(fx.wxrpMint);
  return fx.program.methods
    .depositWxrpToKamino({
      amount: new BN(amount.toString()),
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
}

async function withdraw(
  fx: Fixture,
  amount: bigint,
  userWxrp: PublicKey,
  userYxrp: PublicKey,
) {
  const [cfg] = configPda();
  const [pos] = positionPda(fx.payer.publicKey);
  const [vault] = vaultPda(fx.wxrpMint);
  return fx.program.methods
    .withdraw(new BN(amount.toString()))
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
}

describe("invariants (AUDIT.md)", () => {
  describe("I3 — deposit cap boundary", () => {
    it("accepts amount == max_single_deposit and rejects amount == cap + 1", async () => {
      const CAP = 1_000_000n;
      const fx = await setup({ maxSingleDeposit: CAP });
      const [cfg] = configPda();
      const cfgBefore = await (fx.program.account as any).config.fetch(cfg);
      expect(cfgBefore.maxSingleDeposit.toString()).toBe(CAP.toString());

      // First user: amount == CAP should succeed.
      const u1 = await fundUser(fx, fx.payer.publicKey, CAP);
      await deposit(fx, CAP, u1.userWxrp, u1.userYxrp);

      // amount == CAP + 1 must revert. Fund a generous extra so the revert is
      // solely driven by the cap, not by balance.
      const u2 = await fundUser(fx, fx.payer.publicKey, CAP + 10n);
      await expect(deposit(fx, CAP + 1n, u2.userWxrp, u2.userYxrp)).rejects.toThrow(
        /CapExceeded/,
      );
    });
  });

  describe("I4 — pause never blocks withdraw", () => {
    it("lets a paused user withdraw their full principal", async () => {
      const fx = await setup();
      const AMT = 2_500_000n;
      const { userWxrp, userYxrp } = await fundUser(fx, fx.payer.publicKey, AMT);

      await deposit(fx, AMT, userWxrp, userYxrp);

      // Pause the program via the authority signer.
      const [cfg] = configPda();
      await fx.program.methods
        .setPaused(true)
        .accounts({ config: cfg, authority: fx.payer.publicKey })
        .rpc();

      // Withdraw must still clear to the user even though Config.paused == true.
      await withdraw(fx, AMT, userWxrp, userYxrp);

      const userWxrpAfter = await getAccount(fx.ctx.banksClient, userWxrp);
      expect(userWxrpAfter.amount.toString()).toBe(AMT.toString());

      const [pos] = positionPda(fx.payer.publicKey);
      const position = await (fx.program.account as any).position.fetch(pos);
      expect(position.principal.toString()).toBe("0");
      expect(position.receiptSupply.toString()).toBe("0");
    });
  });

  describe("I5 — 1:1 receipt round-trip", () => {
    it.each([
      { amount: 1_000n },
      { amount: 1_000_000n },
      { amount: 999_999_999n },
    ])("deposit $amount + withdraw $amount returns position to zero", async ({ amount }) => {
      const fx = await setup({ maxSingleDeposit: 1_000_000_000n });
      const { userWxrp, userYxrp } = await fundUser(fx, fx.payer.publicKey, amount);

      await deposit(fx, amount, userWxrp, userYxrp);
      await withdraw(fx, amount, userWxrp, userYxrp);

      const [pos] = positionPda(fx.payer.publicKey);
      const position = await (fx.program.account as any).position.fetch(pos);
      expect(position.principal.toString()).toBe("0");
      expect(position.receiptSupply.toString()).toBe("0");

      const yxrpBalance = await getAccount(fx.ctx.banksClient, userYxrp);
      expect(yxrpBalance.amount.toString()).toBe("0");

      const wxrpBalance = await getAccount(fx.ctx.banksClient, userWxrp);
      expect(wxrpBalance.amount.toString()).toBe(amount.toString());
    });
  });

  describe("I7 — Position PDA is accumulator, not setter", () => {
    it("two deposits accumulate into the same Position PDA", async () => {
      const fx = await setup();
      const FIRST = 1_500_000n;
      const SECOND = 2_700_000n;
      const { userWxrp, userYxrp } = await fundUser(
        fx,
        fx.payer.publicKey,
        FIRST + SECOND,
      );

      await deposit(fx, FIRST, userWxrp, userYxrp);
      const [pos] = positionPda(fx.payer.publicKey);
      const afterFirst = await (fx.program.account as any).position.fetch(pos);
      expect(afterFirst.principal.toString()).toBe(FIRST.toString());
      expect(afterFirst.receiptSupply.toString()).toBe(FIRST.toString());

      await deposit(fx, SECOND, userWxrp, userYxrp);
      const afterSecond = await (fx.program.account as any).position.fetch(pos);
      expect(afterSecond.principal.toString()).toBe((FIRST + SECOND).toString());
      expect(afterSecond.receiptSupply.toString()).toBe((FIRST + SECOND).toString());

      const yxrpBalance = await getAccount(fx.ctx.banksClient, userYxrp);
      expect(yxrpBalance.amount.toString()).toBe((FIRST + SECOND).toString());
    });
  });
});
