#!/usr/bin/env -S npx tsx
/**
 * End-to-end deposit against the live devnet program. Runs the deployer as
 * both the user and the attestor (devnet only). Full flow:
 *
 *   1. Mint 100 wXRP into the deployer's ATA.
 *   2. Sign an attestation for venue 0 (kamino) at the current slot.
 *   3. Submit depositWxrpToKamino with the ed25519 pre-ix.
 *   4. Read the Position PDA and log principal + receipt_supply.
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
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
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
const ART = resolve(REPO_ROOT, "ops/artifacts/devnet");
const DEPLOYER_PATH = resolve(homedir(), ".config/solana/dinosecurities-deployer.json");

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const KAMINO_PROGRAM_ID = new PublicKey(
  "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
);

function loadKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(path, "utf8")) as number[]),
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
  const attestor = loadKeypair(resolve(ART, "attestor.json"));
  const mints = JSON.parse(readFileSync(resolve(ART, "mints.json"), "utf8"));
  const wxrpMint = Keypair.fromSecretKey(Uint8Array.from(mints.wxrp)).publicKey;
  const yxrpMint = Keypair.fromSecretKey(Uint8Array.from(mints.yxrp)).publicKey;

  const idl = JSON.parse(readFileSync(IDL_PATH, "utf8"));
  const PROGRAM_ID = new PublicKey(idl.address);

  const provider = new AnchorProvider(conn, new Wallet(deployer), {
    commitment: "confirmed",
  });
  const program = new Program(idl as any, provider);

  const [cfg] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID,
  );
  const [pos] = PublicKey.findProgramAddressSync(
    [Buffer.from("position"), deployer.publicKey.toBuffer()],
    PROGRAM_ID,
  );
  const [vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), wxrpMint.toBuffer()],
    PROGRAM_ID,
  );

  const userWxrp = getAssociatedTokenAddressSync(wxrpMint, deployer.publicKey);
  const userYxrp = getAssociatedTokenAddressSync(yxrpMint, deployer.publicKey);

  console.log("program:", PROGRAM_ID.toBase58());
  console.log("user:   ", deployer.publicKey.toBase58());
  console.log("position:", pos.toBase58());

  // 1. Ensure user ATAs exist + top up wXRP. 100 wXRP at 6 decimals.
  const amount = 100_000_000n;
  console.log("\n[1/3] ensure ATAs + mint 100 wXRP to user");
  const prep = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      deployer.publicKey,
      userWxrp,
      deployer.publicKey,
      wxrpMint,
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      deployer.publicKey,
      userYxrp,
      deployer.publicKey,
      yxrpMint,
    ),
    createMintToInstruction(wxrpMint, userWxrp, deployer.publicKey, amount),
  );
  const { blockhash: bh1 } = await conn.getLatestBlockhash();
  prep.recentBlockhash = bh1;
  prep.feePayer = deployer.publicKey;
  prep.sign(deployer);
  const prepSig = await conn.sendRawTransaction(prep.serialize());
  await conn.confirmTransaction(prepSig, "confirmed");
  console.log("  prep tx:", prepSig);

  // 2. Sign the attestation.
  const venue = 0; // kamino
  const slot = BigInt(await conn.getSlot());
  const msg = attestationMessage(venue, slot);
  const sig = nacl.sign.detached(msg, attestor.secretKey);
  const edIx = Ed25519Program.createInstructionWithPublicKey({
    publicKey: attestor.publicKey.toBytes(),
    message: msg,
    signature: sig,
  });
  console.log("\n[2/3] signed attestation");
  console.log("  venue:", venue);
  console.log("  slot: ", slot.toString());

  // 3. Deposit.
  console.log("\n[3/3] deposit");
  const depositAmount = new BN(10_000_000); // 10 wXRP
  const depositSig = await program.methods
    .depositWxrpToKamino({
      amount: depositAmount,
      attestationSlot: new BN(slot.toString()),
      attestationSig: Array.from(sig),
      expectedVenue: venue,
    })
    .accounts({
      config: cfg,
      position: pos,
      userWxrp,
      vaultWxrp: vault,
      yxrpMint,
      userYxrp,
      venueProgram: KAMINO_PROGRAM_ID,
      ixSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      user: deployer.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions([edIx])
    .rpc();
  console.log("  deposit tx:", depositSig);
  console.log(
    `  https://explorer.solana.com/tx/${depositSig}?cluster=devnet`,
  );

  const position = await (program.account as any).position.fetch(pos);
  const yxrp = await getAccount(conn, userYxrp);

  console.log("\n[verify]");
  console.log("  position.owner:         ", position.owner.toBase58());
  console.log("  position.venue:         ", position.venue);
  console.log("  position.principal:     ", position.principal.toString());
  console.log("  position.receipt_supply:", position.receiptSupply.toString());
  console.log("  user yXRP balance:      ", yxrp.amount.toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
