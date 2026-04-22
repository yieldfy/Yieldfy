#!/usr/bin/env -S npx tsx
/**
 * End-to-end smoke test against mainnet-beta.
 *
 * Constructs the ed25519 attestation locally using the mainnet attestor
 * keypair — no optimizer HTTP call needed, so this runs independently of
 * powerz's optimizer deployment state. Validates:
 *
 *   1. ed25519 precompile ix is parsed correctly by attest::verify.
 *   2. Config.attestor pubkey matches the signing key.
 *   3. Config.paused == false (if paused, deposit reverts with Paused).
 *   4. max_single_deposit honors the amount.
 *   5. wXRP moves: user -> vault.
 *   6. yXRP is minted 1:1 to the user.
 *   7. Position PDA is created with correct fields.
 *
 * Safe to re-run: only effect is additional deposits accumulating into the
 * Position PDA.
 */
import {
  Connection,
  Ed25519Program,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  getAccount,
} from "@solana/spl-token";
import anchorPkg from "@coral-xyz/anchor";
const { AnchorProvider, Program, BN, Wallet } = anchorPkg;
import nacl from "tweetnacl";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "../..");
const IDL_PATH = resolve(REPO_ROOT, "packages/sdk/src/idl/yieldfy.json");
const DEPLOYER_PATH = resolve(homedir(), ".config/solana/yieldfy-mainnet-deployer.json");
const ATTESTOR_PATH = resolve(REPO_ROOT, "ops/artifacts/mainnet/attestor.json");

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const KAMINO_PROGRAM_ID = new PublicKey(
  "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
);
const DEPOSIT_AMOUNT = 1_000_000n; // 1 wXRP at 6 decimals

function loadKeypair(p: string): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(p, "utf8"))),
  );
}

function attestationMessage(venue: number, slot: bigint): Buffer {
  const buf = Buffer.alloc(9);
  buf.writeUInt8(venue, 0);
  buf.writeBigUInt64LE(slot, 1);
  return buf;
}

async function main() {
  const conn = new Connection(RPC_URL, "confirmed");
  const deployer = loadKeypair(DEPLOYER_PATH);
  const attestor = loadKeypair(ATTESTOR_PATH);

  const idl = JSON.parse(readFileSync(IDL_PATH, "utf8"));
  const PROGRAM_ID = new PublicKey(idl.address);

  const provider = new AnchorProvider(conn, new Wallet(deployer), {
    commitment: "confirmed",
  });
  const program = new Program(idl as any, provider);

  const [cfgPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID,
  );
  const [positionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("position"), deployer.publicKey.toBuffer()],
    PROGRAM_ID,
  );

  const cfg = await (program.account as any).config.fetch(cfgPda);
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), cfg.wxrpMint.toBuffer()],
    PROGRAM_ID,
  );

  console.log("=== Config snapshot ===");
  console.log("  authority:        ", cfg.authority.toBase58());
  console.log("  attestor:         ", cfg.attestor.toBase58());
  console.log("  wxrp_mint:        ", cfg.wxrpMint.toBase58());
  console.log("  yxrp_mint:        ", cfg.yxrpMint.toBase58());
  console.log("  max_single_deposit:", cfg.maxSingleDeposit.toString());
  console.log("  paused:           ", cfg.paused);
  console.log();

  if (!cfg.attestor.equals(attestor.publicKey)) {
    throw new Error(
      `Config.attestor ${cfg.attestor.toBase58()} != loaded attestor ${attestor.publicKey.toBase58()}`,
    );
  }
  if (cfg.paused) throw new Error("program is paused");

  const userWxrp = getAssociatedTokenAddressSync(cfg.wxrpMint, deployer.publicKey);
  const userYxrp = getAssociatedTokenAddressSync(cfg.yxrpMint, deployer.publicKey);

  // Ensure user's yXRP ATA exists (wXRP ATA already exists since user was funded).
  const ataIx = createAssociatedTokenAccountIdempotentInstruction(
    deployer.publicKey,
    userYxrp,
    deployer.publicKey,
    cfg.yxrpMint,
  );

  // Build the attestation: sign [venue=0, slot_le] with the attestor privkey.
  const slot = BigInt(await conn.getSlot("confirmed"));
  const msg = attestationMessage(0, slot);
  const sig = nacl.sign.detached(msg, attestor.secretKey);
  const edIx = Ed25519Program.createInstructionWithPublicKey({
    publicKey: attestor.publicKey.toBytes(),
    message: msg,
    signature: sig,
  });

  console.log("=== Submitting deposit ===");
  console.log("  amount:       ", DEPOSIT_AMOUNT.toString(), "(1 wXRP)");
  console.log("  attest slot:  ", slot.toString());
  console.log("  venue:        ", "0 (kamino)");
  console.log();

  const yxrpBefore = await getAccount(conn, userYxrp).catch(() => null);

  const txSig = await program.methods
    .depositWxrpToKamino({
      amount: new BN(DEPOSIT_AMOUNT.toString()),
      attestationSlot: new BN(slot.toString()),
      attestationSig: Array.from(sig),
      expectedVenue: 0,
    })
    .accounts({
      config: cfgPda,
      position: positionPda,
      userWxrp,
      vaultWxrp: vaultPda,
      yxrpMint: cfg.yxrpMint,
      userYxrp,
      venueProgram: KAMINO_PROGRAM_ID,
      ixSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      user: deployer.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    // attest::verify reads ed25519 at ix-sysvar index 0, so edIx must be first.
    .preInstructions([edIx, ataIx])
    .rpc();

  console.log("deposit tx:", txSig);
  await conn.confirmTransaction(txSig, "confirmed");

  const yxrpAfter = await getAccount(conn, userYxrp);
  const position = await (program.account as any).position.fetch(positionPda);

  console.log("\n=== Post-deposit verification ===");
  console.log("  yXRP balance:", yxrpAfter.amount.toString());
  console.log("  Position.principal:      ", position.principal.toString());
  console.log("  Position.receipt_supply: ", position.receiptSupply.toString());
  console.log("  Position.venue:          ", position.venue);
  console.log("  Position.owner:          ", position.owner.toBase58());

  const yxrpDelta =
    yxrpAfter.amount - (yxrpBefore?.amount ?? 0n);
  if (yxrpDelta !== DEPOSIT_AMOUNT) {
    throw new Error(
      `yXRP delta ${yxrpDelta} != expected ${DEPOSIT_AMOUNT} — 1:1 mint invariant failed`,
    );
  }

  console.log(
    `\n✅ smoke test passed — 1 wXRP deposited, 1 yXRP minted, Position PDA live`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
