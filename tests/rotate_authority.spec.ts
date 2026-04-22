import { describe, it, expect, beforeAll } from "vitest";
import { Keypair } from "@solana/web3.js";
import { setup, configPda, type Fixture } from "./helpers.js";

describe("rotate_authority", () => {
  let fx: Fixture;

  beforeAll(async () => {
    fx = await setup();
  });

  it("allows the current authority to rotate to a new authority", async () => {
    const [cfg] = configPda();
    const newAuthority = Keypair.generate().publicKey;

    await fx.program.methods
      .rotateAuthority(newAuthority)
      .accounts({ config: cfg, authority: fx.payer.publicKey })
      .rpc();

    const config = await (fx.program.account as any).config.fetch(cfg);
    expect(config.authority.toBase58()).toBe(newAuthority.toBase58());
  });

  it("rejects a non-authority signer", async () => {
    const [cfg] = configPda();
    const imposter = Keypair.generate();
    const target = Keypair.generate().publicKey;

    // The AdminOnly `has_one = authority` constraint requires the signer key
    // to match config.authority; after the first test, that's the rotated
    // pubkey, so fx.payer no longer qualifies. Confirm it reverts.
    await expect(
      fx.program.methods
        .rotateAuthority(target)
        .accounts({ config: cfg, authority: fx.payer.publicKey })
        .rpc(),
    ).rejects.toThrow(/BadAttestor|has one|constraint/i);

    // And an entirely unrelated signer also fails.
    await expect(
      fx.program.methods
        .rotateAuthority(target)
        .accounts({ config: cfg, authority: imposter.publicKey })
        .signers([imposter])
        .rpc(),
    ).rejects.toThrow();
  });
});
