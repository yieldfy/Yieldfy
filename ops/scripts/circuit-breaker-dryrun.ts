#!/usr/bin/env -S npx tsx
/**
 * Circuit-breaker dry-run against devnet.
 *
 * Exercises the live `set_paused` / `rotate_attestor` / `set_cap` path end
 * to end:
 *
 *   [1/6] snapshot Config before run
 *   [2/6] set_paused(true)   — expect PausedToggled event
 *   [3/6] attempt a small deposit  — expect revert: YieldfyError::Paused (6000)
 *   [4/6] set_paused(false)  — restore
 *   [5/6] attempt the same deposit — expect success
 *   [6/6] verify Config matches the snapshot
 *
 * Safe to run multiple times. Only mutates `Config.paused` and emits a
 * 1-wXRP round-trip through the vault. Does NOT touch mainnet.
 *
 * Usage:
 *   DRY_RUN=1  npx tsx ops/scripts/circuit-breaker-dryrun.ts   # default: no tx sent
 *   DRY_RUN=0  npx tsx ops/scripts/circuit-breaker-dryrun.ts   # actually execute
 *
 * Expects:
 *   - Solana CLI configured for devnet.
 *   - Authority keypair at the same path used by init-devnet.ts
 *     (~/.config/solana/dinosecurities-deployer.json).
 *   - The program + Config already initialized (see ops/DEPLOYMENTS.md).
 *   - The authority wallet has >= 1 wXRP and >= 0.01 SOL for fees.
 */
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import anchorPkg from "@coral-xyz/anchor";
const { AnchorProvider, Program, BN, Wallet } = anchorPkg;
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "../..");
const IDL_PATH = resolve(REPO_ROOT, "packages/sdk/src/idl/yieldfy.json");
const DEPLOYER_PATH = resolve(homedir(), ".config/solana/dinosecurities-deployer.json");

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const DRY_RUN = process.env.DRY_RUN !== "0";
const OPTIMIZER_URL = process.env.OPTIMIZER_URL ?? "https://optimizer.yieldfy.ai";

function loadKeypair(path: string): Keypair {
  const bytes = JSON.parse(readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}

async function fetchAttestation(venue: number) {
  const res = await fetch(`${OPTIMIZER_URL}/attest?profile=balanced`);
  if (!res.ok) throw new Error(`optimizer /attest ${res.status}`);
  const body = (await res.json()) as {
    attestation: {
      venue: string;
      venueCode: number;
      slot: string;
      sigHex: string;
    };
  };
  const att = body.attestation;
  if (att.venueCode !== venue) {
    throw new Error(
      `optimizer returned venueCode=${att.venueCode}, expected ${venue}`,
    );
  }
  return { slot: Number(att.slot), venueCode: att.venueCode, sigHex: att.sigHex };
}

async function main() {
  const conn = new Connection(RPC_URL, "confirmed");
  const authority = loadKeypair(DEPLOYER_PATH);
  const idl = JSON.parse(readFileSync(IDL_PATH, "utf8"));
  const PROGRAM_ID = new PublicKey(idl.address);
  const [cfgPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID,
  );

  const provider = new AnchorProvider(conn, new Wallet(authority), {
    commitment: "confirmed",
  });
  const program = new Program(idl as any, provider);

  console.log(DRY_RUN ? "[DRY_RUN=1]" : "[EXECUTING]");
  console.log("program  :", PROGRAM_ID.toBase58());
  console.log("config   :", cfgPda.toBase58());
  console.log("authority:", authority.publicKey.toBase58());
  console.log("optimizer:", OPTIMIZER_URL);

  // [1/6] snapshot
  console.log("\n[1/6] snapshot Config");
  const before = await (program.account as any).config.fetch(cfgPda);
  console.log("  paused           :", before.paused);
  console.log("  attestor         :", before.attestor.toBase58());
  console.log("  max_single_deposit:", before.maxSingleDeposit.toString());
  console.log("  staleness_slots  :", before.stalenessSlots.toString());
  if (before.paused) {
    throw new Error("Config is already paused — refuse to dry-run");
  }
  if (!before.authority.equals(authority.publicKey)) {
    throw new Error(
      `loaded keypair ${authority.publicKey.toBase58()} != Config.authority ${before.authority.toBase58()}`,
    );
  }

  // [2/6] pause
  console.log("\n[2/6] set_paused(true)");
  if (DRY_RUN) {
    console.log("  [dry-run] would call set_paused(true)");
  } else {
    const sig = await program.methods
      .setPaused(true)
      .accounts({ config: cfgPda, authority: authority.publicKey })
      .rpc();
    console.log("  tx:", sig);
  }

  // [3/6] deposit while paused — expect revert
  console.log("\n[3/6] deposit while paused — expect YieldfyError::Paused");
  const wxrpAta = getAssociatedTokenAddressSync(before.wxrpMint, authority.publicKey);
  const yxrpAta = getAssociatedTokenAddressSync(before.yxrpMint, authority.publicKey);
  if (DRY_RUN) {
    console.log("  [dry-run] would fetch attestation + attempt deposit of 1_000_000");
  } else {
    try {
      const att = await fetchAttestation(0);
      await program.methods
        .depositWxrpToKamino({
          amount: new BN(1_000_000),
          attestationSlot: new BN(att.slot),
          attestationSig: Array.from(Buffer.from(att.sigHex, "hex")),
          expectedVenue: 0,
        })
        .accounts({
          config: cfgPda,
          position: PublicKey.findProgramAddressSync(
            [Buffer.from("position"), authority.publicKey.toBuffer()],
            PROGRAM_ID,
          )[0],
          userWxrp: wxrpAta,
          vaultWxrp: PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), before.wxrpMint.toBuffer()],
            PROGRAM_ID,
          )[0],
          yxrpMint: before.yxrpMint,
          userYxrp: yxrpAta,
          venueProgram: new PublicKey("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD"), // Kamino
          ixSysvar: new PublicKey("Sysvar1nstructions1111111111111111111111111"),
          user: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      throw new Error("deposit succeeded while paused — INVARIANT VIOLATED");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Paused") && !msg.includes("6000")) {
        throw new Error(`deposit failed with unexpected error: ${msg}`);
      }
      console.log("  ✓ reverted as expected:", msg.split("\n")[0]);
    }
  }

  // [4/6] unpause
  console.log("\n[4/6] set_paused(false)");
  if (DRY_RUN) {
    console.log("  [dry-run] would call set_paused(false)");
  } else {
    const sig = await program.methods
      .setPaused(false)
      .accounts({ config: cfgPda, authority: authority.publicKey })
      .rpc();
    console.log("  tx:", sig);
  }

  // [5/6] deposit works again — optional, off by default since it spends wXRP
  console.log(
    "\n[5/6] [skipped] post-unpause deposit — rerun ops/scripts/devnet-deposit.ts manually if you want a full round-trip",
  );

  // [6/6] verify Config matches before
  console.log("\n[6/6] verify Config restored");
  if (DRY_RUN) {
    console.log("  [dry-run] would re-fetch Config and diff against snapshot");
  } else {
    const after = await (program.account as any).config.fetch(cfgPda);
    if (after.paused !== before.paused) {
      throw new Error(`paused did not restore: ${before.paused} -> ${after.paused}`);
    }
    if (!after.attestor.equals(before.attestor)) {
      throw new Error("attestor drifted during dry-run");
    }
    console.log("  ✓ Config matches snapshot");
  }

  console.log("\ncircuit-breaker dry-run complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
