import { describe, it, expect, beforeAll } from "vitest";
import { BN } from "@coral-xyz/anchor";
import {
  Ed25519Program,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import nacl from "tweetnacl";
import {
  setup,
  fundUser,
  currentSlot,
  configPda,
  positionPda,
  vaultPda,
  attestationMessage,
  edIxFor,
  KAMINO_PROGRAM_ID,
  type Fixture,
} from "./helpers.js";

/**
 * Every path through `attest::verify` + the deposit-ix guards. A green test
 * here means a tampered attestation, a stale slot, a spoofed attestor, or
 * a paused config all revert before any token moves.
 */
describe("attestation + deposit negative paths", () => {
  let fx: Fixture;
  let userWxrp: PublicKey;
  let userYxrp: PublicKey;
  const amount = new BN(1_000_000);

  async function depositWith(
    preIxs: any[],
    args: {
      amount: BN;
      attestationSlot: BN;
      attestationSig: number[];
      expectedVenue: number;
    },
  ) {
    const [cfg] = configPda();
    const [pos] = positionPda(fx.payer.publicKey);
    const [vault] = vaultPda(fx.wxrpMint);
    return fx.program.methods
      .depositWxrpToKamino(args)
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
      .preInstructions(preIxs)
      .rpc();
  }

  beforeAll(async () => {
    fx = await setup({ stalenessSlots: 10n });
    ({ userWxrp, userYxrp } = await fundUser(
      fx,
      fx.payer.publicKey,
      BigInt(amount.toString()) * 10n,
    ));
  });

  it("rejects when the ed25519 pre-ix is missing entirely", async () => {
    const slot = await currentSlot(fx);
    const fakeSig = new Uint8Array(64);
    await expect(
      depositWith([], {
        amount,
        attestationSlot: new BN(slot.toString()),
        attestationSig: Array.from(fakeSig),
        expectedVenue: 0,
      }),
    ).rejects.toThrow();
  });

  it("rejects a signature from the wrong attestor key", async () => {
    const slot = await currentSlot(fx);
    const imposter = Keypair.generate();
    const msg = attestationMessage(0, slot);
    const sig = nacl.sign.detached(msg, imposter.secretKey);
    const edIx = Ed25519Program.createInstructionWithPublicKey({
      publicKey: imposter.publicKey.toBytes(),
      message: msg,
      signature: sig,
    });
    await expect(
      depositWith([edIx], {
        amount,
        attestationSlot: new BN(slot.toString()),
        attestationSig: Array.from(sig),
        expectedVenue: 0,
      }),
    ).rejects.toThrow();
  });

  it("rejects when the attestation venue ≠ expected_venue", async () => {
    const slot = await currentSlot(fx);
    // Sign for venue 2, ask the program for venue 0.
    const { ix: edIx } = edIxFor(fx.attestor, 2, slot);
    const { sig: sigFor0 } = edIxFor(fx.attestor, 0, slot);
    await expect(
      depositWith([edIx], {
        amount,
        attestationSlot: new BN(slot.toString()),
        attestationSig: Array.from(sigFor0),
        expectedVenue: 0,
      }),
    ).rejects.toThrow();
  });

  it("rejects a stale slot beyond staleness_slots", async () => {
    // Warp forward so "stale" (slot 0) is far past the 10-slot staleness bound.
    await (fx.ctx as any).warpToSlot(1_000n);
    const stale = 0n;
    const { ix: edIx, sig } = edIxFor(fx.attestor, 0, stale);
    await expect(
      depositWith([edIx], {
        amount,
        attestationSlot: new BN(stale.toString()),
        attestationSig: Array.from(sig),
        expectedVenue: 0,
      }),
    ).rejects.toThrow();
  });

  it("rejects when config.paused = true", async () => {
    const [cfg] = configPda();
    await fx.program.methods
      .setPaused(true)
      .accounts({ config: cfg, authority: fx.payer.publicKey })
      .rpc();

    const slot = await currentSlot(fx);
    const { ix: edIx, sig } = edIxFor(fx.attestor, 0, slot);
    await expect(
      depositWith([edIx], {
        amount,
        attestationSlot: new BN(slot.toString()),
        attestationSig: Array.from(sig),
        expectedVenue: 0,
      }),
    ).rejects.toThrow();

    // unpause for any later tests
    await fx.program.methods
      .setPaused(false)
      .accounts({ config: cfg, authority: fx.payer.publicKey })
      .rpc();
  });
});
