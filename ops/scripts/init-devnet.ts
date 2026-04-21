#!/usr/bin/env -S npx tsx
/**
 * One-shot devnet bootstrap. Safe to re-run: it skips any step whose output
 * already exists. Creates the wXRP + yXRP mints, the devnet attestor key,
 * calls `initialize()` on the live program, and hands the yXRP mint
 * authority to the Config PDA.
 *
 * Usage:
 *   npx tsx ops/scripts/init-devnet.ts
 *
 * Expects:
 *   - Solana CLI configured for devnet (`solana config set --url devnet`)
 *   - The deployer keypair (authority) at ~/.config/solana/dinosecurities-deployer.json
 *   - The program already deployed (see ops/DEPLOYMENTS.md)
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMintLen,
  MINT_SIZE,
  createSetAuthorityInstruction,
  AuthorityType,
  getAccount,
  getMint,
} from "@solana/spl-token";
import anchorPkg from "@coral-xyz/anchor";
const { AnchorProvider, Program, BN, Wallet } = anchorPkg;
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "../..");
const IDL_PATH = resolve(REPO_ROOT, "packages/sdk/src/idl/yieldfy.json");
const ARTIFACTS_DIR = resolve(REPO_ROOT, "ops/artifacts/devnet");
const ATTESTOR_PATH = resolve(ARTIFACTS_DIR, "attestor.json");
const MINTS_PATH = resolve(ARTIFACTS_DIR, "mints.json");
const DEPLOYER_PATH = resolve(homedir(), ".config/solana/dinosecurities-deployer.json");

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

function loadKeypair(path: string): Keypair {
  const bytes = JSON.parse(readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}
function saveKeypair(path: string, kp: Keypair) {
  writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)));
}
function loadOrCreateKeypair(path: string): Keypair {
  if (existsSync(path)) return loadKeypair(path);
  const kp = Keypair.generate();
  saveKeypair(path, kp);
  return kp;
}

async function createMint(
  conn: Connection,
  payer: Keypair,
  mint: Keypair,
  decimals: number,
  mintAuthority: PublicKey,
): Promise<void> {
  try {
    await getMint(conn, mint.publicKey);
    console.log(`  [skip] mint ${mint.publicKey.toBase58()} already initialized`);
    return;
  } catch {
    // fall through
  }
  const space = MINT_SIZE;
  const lamports = await conn.getMinimumBalanceForRentExemption(space);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(mint.publicKey, decimals, mintAuthority, null),
  );
  const { blockhash } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer, mint);
  const sig = await conn.sendRawTransaction(tx.serialize());
  await conn.confirmTransaction(sig, "confirmed");
  console.log(`  mint created: ${mint.publicKey.toBase58()} (tx ${sig.slice(0, 10)}…)`);
}

async function main() {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const conn = new Connection(RPC_URL, "confirmed");
  const deployer = loadKeypair(DEPLOYER_PATH);
  const attestor = loadOrCreateKeypair(ATTESTOR_PATH);
  console.log("deployer:", deployer.publicKey.toBase58());
  console.log("attestor:", attestor.publicKey.toBase58());

  const idl = JSON.parse(readFileSync(IDL_PATH, "utf8"));
  const PROGRAM_ID = new PublicKey(idl.address);
  console.log("program:", PROGRAM_ID.toBase58());

  const provider = new AnchorProvider(conn, new Wallet(deployer), {
    commitment: "confirmed",
  });
  const program = new Program(idl as any, provider);

  // Mints — load from disk if this script has run before; otherwise fresh.
  let wxrpMintKp: Keypair;
  let yxrpMintKp: Keypair;
  if (existsSync(MINTS_PATH)) {
    const { wxrp, yxrp } = JSON.parse(readFileSync(MINTS_PATH, "utf8"));
    wxrpMintKp = Keypair.fromSecretKey(Uint8Array.from(wxrp));
    yxrpMintKp = Keypair.fromSecretKey(Uint8Array.from(yxrp));
  } else {
    wxrpMintKp = Keypair.generate();
    yxrpMintKp = Keypair.generate();
    writeFileSync(
      MINTS_PATH,
      JSON.stringify({
        wxrp: Array.from(wxrpMintKp.secretKey),
        yxrp: Array.from(yxrpMintKp.secretKey),
      }),
    );
  }

  console.log("\n[1/4] mints");
  await createMint(conn, deployer, wxrpMintKp, 6, deployer.publicKey);
  await createMint(conn, deployer, yxrpMintKp, 6, deployer.publicKey);

  const [cfgPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID,
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), wxrpMintKp.publicKey.toBuffer()],
    PROGRAM_ID,
  );
  console.log("config PDA:", cfgPda.toBase58());
  console.log("vault  PDA:", vaultPda.toBase58());

  console.log("\n[2/4] initialize");
  const cfgInfo = await conn.getAccountInfo(cfgPda);
  if (cfgInfo) {
    console.log("  [skip] Config already initialized");
  } else {
    const sig = await program.methods
      .initialize({
        attestor: attestor.publicKey,
        maxSingleDeposit: new BN(1_000_000_000),
        stalenessSlots: new BN(150),
      })
      .accounts({
        config: cfgPda,
        wxrpMint: wxrpMintKp.publicKey,
        yxrpMint: yxrpMintKp.publicKey,
        vaultWxrp: vaultPda,
        authority: deployer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("  initialize tx:", sig);
  }

  console.log("\n[3/4] hand yXRP mint authority to Config PDA");
  const yxrpInfo = await getMint(conn, yxrpMintKp.publicKey);
  if (yxrpInfo.mintAuthority && yxrpInfo.mintAuthority.equals(cfgPda)) {
    console.log("  [skip] yXRP authority already = Config PDA");
  } else {
    const tx = new Transaction().add(
      createSetAuthorityInstruction(
        yxrpMintKp.publicKey,
        deployer.publicKey,
        AuthorityType.MintTokens,
        cfgPda,
      ),
    );
    const { blockhash } = await conn.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = deployer.publicKey;
    tx.sign(deployer);
    const sig = await conn.sendRawTransaction(tx.serialize());
    await conn.confirmTransaction(sig, "confirmed");
    console.log("  SetAuthority tx:", sig);
  }

  console.log("\n[4/4] verify");
  const cfg = await (program.account as any).config.fetch(cfgPda);
  console.log("  authority:        ", cfg.authority.toBase58());
  console.log("  attestor:         ", cfg.attestor.toBase58());
  console.log("  wxrp_mint:        ", cfg.wxrpMint.toBase58());
  console.log("  yxrp_mint:        ", cfg.yxrpMint.toBase58());
  console.log("  max_single_deposit:", cfg.maxSingleDeposit.toString());
  console.log("  staleness_slots:  ", cfg.stalenessSlots.toString());
  console.log("  paused:           ", cfg.paused);

  console.log("\ndevnet bootstrap complete");
  console.log("\nCopy-paste into apps/dashboard/.env.devnet:");
  console.log(`VITE_SOLANA_RPC_URL=${RPC_URL}`);
  console.log(`VITE_YIELDFY_PROGRAM_ID=${PROGRAM_ID.toBase58()}`);
  console.log(`VITE_WXRP_MINT=${wxrpMintKp.publicKey.toBase58()}`);
  console.log(`VITE_YXRP_MINT=${yxrpMintKp.publicKey.toBase58()}`);
  console.log("\nOptimizer env:");
  console.log(`YIELDFY_ATTESTOR_KEY=$(cat ${ATTESTOR_PATH})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
