#!/usr/bin/env -S npx tsx
/**
 * One-shot mainnet-beta bootstrap. Safe to re-run: every step is idempotent.
 *
 *   [1/5] create yXRP mint (if missing), persist its keypair under ops/artifacts/mainnet/
 *   [2/5] initialize Config with deployer as temporary authority, cap = 100 wXRP
 *   [3/5] rotate_authority → Squads vault
 *   [4/5] transfer yXRP mint authority → Config PDA
 *   [5/5] verify
 *
 * Reads wXRP mint + attestor from existing artifacts/env so there's nothing
 * to paste at runtime.
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
  MINT_SIZE,
  createSetAuthorityInstruction,
  AuthorityType,
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
const ARTIFACTS_DIR = resolve(REPO_ROOT, "ops/artifacts/mainnet");
const ATTESTOR_PATH = resolve(ARTIFACTS_DIR, "attestor.json");
const YXRP_PATH = resolve(ARTIFACTS_DIR, "yxrp-mint.json");
const DEPLOYER_PATH = resolve(homedir(), ".config/solana/yieldfy-mainnet-deployer.json");

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

// Fixed mainnet constants — confirmed on-chain before running this script.
const WXRP_MINT = new PublicKey("6UpQcMAb5xMzxc7ZfPaVMgx3KqsvKZdT5U718BzD5We2");
const SQUADS_VAULT = new PublicKey("48uosZFYVqLr5XEKsuohtrwfnsYkcqP9PVX838rGZXKD");
const MAX_SINGLE_DEPOSIT = 100_000_000n; // 100 wXRP at 6 decimals
const STALENESS_SLOTS = 150n;

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

async function main() {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const conn = new Connection(RPC_URL, "confirmed");
  const deployer = loadKeypair(DEPLOYER_PATH);
  const attestor = loadKeypair(ATTESTOR_PATH);
  const yxrpMintKp = loadOrCreateKeypair(YXRP_PATH);

  const idl = JSON.parse(readFileSync(IDL_PATH, "utf8"));
  const PROGRAM_ID = new PublicKey(idl.address);

  console.log("deployer       :", deployer.publicKey.toBase58());
  console.log("attestor       :", attestor.publicKey.toBase58());
  console.log("wXRP mint      :", WXRP_MINT.toBase58());
  console.log("yXRP mint (new):", yxrpMintKp.publicKey.toBase58());
  console.log("squads vault   :", SQUADS_VAULT.toBase58());
  console.log("program        :", PROGRAM_ID.toBase58());

  const provider = new AnchorProvider(conn, new Wallet(deployer), {
    commitment: "confirmed",
  });
  const program = new Program(idl as any, provider);

  const [cfgPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID,
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), WXRP_MINT.toBuffer()],
    PROGRAM_ID,
  );

  console.log("config PDA     :", cfgPda.toBase58());
  console.log("vault  PDA     :", vaultPda.toBase58());

  // [1/5] yXRP mint
  console.log("\n[1/5] yXRP mint");
  try {
    await getMint(conn, yxrpMintKp.publicKey);
    console.log("  [skip] yXRP mint already exists");
  } catch {
    const lamports = await conn.getMinimumBalanceForRentExemption(MINT_SIZE);
    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: deployer.publicKey,
        newAccountPubkey: yxrpMintKp.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        yxrpMintKp.publicKey,
        6,
        deployer.publicKey,
        null,
      ),
    );
    const { blockhash } = await conn.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = deployer.publicKey;
    tx.sign(deployer, yxrpMintKp);
    const sig = await conn.sendRawTransaction(tx.serialize());
    await conn.confirmTransaction(sig, "confirmed");
    console.log("  created, tx:", sig);
  }

  // [2/5] initialize
  console.log("\n[2/5] initialize (authority = deployer, temporary)");
  const cfgInfo = await conn.getAccountInfo(cfgPda);
  if (cfgInfo) {
    console.log("  [skip] Config already initialized");
  } else {
    const sig = await program.methods
      .initialize({
        attestor: attestor.publicKey,
        maxSingleDeposit: new BN(MAX_SINGLE_DEPOSIT.toString()),
        stalenessSlots: new BN(STALENESS_SLOTS.toString()),
      })
      .accounts({
        config: cfgPda,
        wxrpMint: WXRP_MINT,
        yxrpMint: yxrpMintKp.publicKey,
        vaultWxrp: vaultPda,
        authority: deployer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("  initialize tx:", sig);
  }

  // [3/5] rotate authority → Squads
  console.log("\n[3/5] rotate_authority → Squads vault");
  const cfgAfterInit = await (program.account as any).config.fetch(cfgPda);
  if (cfgAfterInit.authority.equals(SQUADS_VAULT)) {
    console.log("  [skip] authority already = Squads vault");
  } else if (!cfgAfterInit.authority.equals(deployer.publicKey)) {
    throw new Error(
      `authority drifted: expected deployer, got ${cfgAfterInit.authority.toBase58()}`,
    );
  } else {
    const sig = await program.methods
      .rotateAuthority(SQUADS_VAULT)
      .accounts({ config: cfgPda, authority: deployer.publicKey })
      .rpc();
    console.log("  rotate_authority tx:", sig);
  }

  // [4/5] yXRP mint authority → Config PDA
  console.log("\n[4/5] yXRP mint authority → Config PDA");
  const yxrpMint = await getMint(conn, yxrpMintKp.publicKey);
  if (yxrpMint.mintAuthority && yxrpMint.mintAuthority.equals(cfgPda)) {
    console.log("  [skip] yXRP authority already = Config PDA");
  } else {
    const setAuth = createSetAuthorityInstruction(
      yxrpMintKp.publicKey,
      deployer.publicKey,
      AuthorityType.MintTokens,
      cfgPda,
    );
    const tx = new Transaction().add(setAuth);
    const { blockhash } = await conn.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = deployer.publicKey;
    tx.sign(deployer);
    const sig = await conn.sendRawTransaction(tx.serialize());
    await conn.confirmTransaction(sig, "confirmed");
    console.log("  SetAuthority tx:", sig);
  }

  // [5/5] verify
  console.log("\n[5/5] verify");
  const cfg = await (program.account as any).config.fetch(cfgPda);
  const yxrpFinal = await getMint(conn, yxrpMintKp.publicKey);
  console.log("  authority          :", cfg.authority.toBase58());
  console.log("  attestor           :", cfg.attestor.toBase58());
  console.log("  wxrp_mint          :", cfg.wxrpMint.toBase58());
  console.log("  yxrp_mint          :", cfg.yxrpMint.toBase58());
  console.log("  max_single_deposit :", cfg.maxSingleDeposit.toString());
  console.log("  staleness_slots    :", cfg.stalenessSlots.toString());
  console.log("  paused             :", cfg.paused);
  console.log("  yXRP mint authority:", yxrpFinal.mintAuthority?.toBase58());

  if (!cfg.authority.equals(SQUADS_VAULT)) {
    throw new Error("FAIL: Config.authority != Squads vault");
  }
  if (!yxrpFinal.mintAuthority?.equals(cfgPda)) {
    throw new Error("FAIL: yXRP mint authority != Config PDA");
  }
  console.log("\n✅ mainnet bootstrap complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
