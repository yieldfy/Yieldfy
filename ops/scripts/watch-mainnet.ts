#!/usr/bin/env -S npx tsx
/**
 * Beta-0 on-chain watch — one-shot health check against mainnet-beta Config
 * and Position state. Designed to run under cron (e.g. every 5 min) during
 * the Beta-0 watch window. Exit 0 = healthy; non-zero = at least one
 * invariant or safety check failed.
 *
 * Checks:
 *
 *   1. Config.paused == false (unless PAUSED_OK=1 is set for maintenance)
 *   2. Config.authority == Squads vault (catches surreptitious rotate_authority)
 *   3. Config.attestor == expected mainnet attestor (catches surreptitious rotate_attestor)
 *   4. Config.max_single_deposit matches the advertised Beta-0 cap (100 wXRP)
 *   5. sum(Position.principal) == vault_wxrp.amount — invariant I5 aggregate.
 *      If these drift, either the program lost funds, vault was drained via
 *      an unforeseen path, or Kamino CPI (Phase C) has arrived and the
 *      equation needs to be updated to account for obligation collateral.
 *   6. yXRP total supply == sum(Position.receipt_supply)
 *
 * Usage:
 *   npx tsx ops/scripts/watch-mainnet.ts
 *   ALERT_WEBHOOK=https://hooks.slack.com/... npx tsx ops/scripts/watch-mainnet.ts
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount, getMint } from "@solana/spl-token";
import anchorPkg from "@coral-xyz/anchor";
const { AnchorProvider, Program, Wallet } = anchorPkg;
import { Keypair } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "../..");
const IDL_PATH = resolve(REPO_ROOT, "packages/sdk/src/idl/yieldfy.json");

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const PAUSED_OK = process.env.PAUSED_OK === "1";
const ALERT_WEBHOOK = process.env.ALERT_WEBHOOK;

// Expected mainnet state — pinned here so the watcher catches any drift.
const EXPECTED_AUTHORITY = "48uosZFYVqLr5XEKsuohtrwfnsYkcqP9PVX838rGZXKD";
const EXPECTED_ATTESTOR = "E86gTzWPwnFPtscwGn3NYQhkWt1S2RXN5Csj1mTBDMgo";
const EXPECTED_MAX_SINGLE_DEPOSIT = 100_000_000n;
const EXPECTED_WXRP_MINT = "6UpQcMAb5xMzxc7ZfPaVMgx3KqsvKZdT5U718BzD5We2";
const EXPECTED_YXRP_MINT = "4GPZvtLVqKryEuUQbk4Ap7JiHQ1u4RdLc9UfYweCbnp5";

type Check = { ok: boolean; label: string; detail: string };

async function alertWebhook(failures: Check[]): Promise<void> {
  if (!ALERT_WEBHOOK) return;
  const text =
    "🚨 Yieldfy mainnet invariant breach:\n" +
    failures.map((f) => `• ${f.label}: ${f.detail}`).join("\n");
  try {
    await fetch(ALERT_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("alert webhook failed:", err);
  }
}

async function main() {
  const conn = new Connection(RPC_URL, "confirmed");
  const idl = JSON.parse(readFileSync(IDL_PATH, "utf8"));
  const PROGRAM_ID = new PublicKey(idl.address);

  // Read-only — use a throwaway keypair for the provider wallet.
  const provider = new AnchorProvider(conn, new Wallet(Keypair.generate()), {
    commitment: "confirmed",
  });
  const program = new Program(idl as any, provider);

  const [cfgPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID,
  );

  const cfg = await (program.account as any).config.fetch(cfgPda);
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), cfg.wxrpMint.toBuffer()],
    PROGRAM_ID,
  );

  const checks: Check[] = [];

  checks.push({
    ok: PAUSED_OK || !cfg.paused,
    label: "Config.paused",
    detail: cfg.paused
      ? "paused (set PAUSED_OK=1 if intentional)"
      : "unpaused",
  });

  checks.push({
    ok: cfg.authority.toBase58() === EXPECTED_AUTHORITY,
    label: "Config.authority matches Squads vault",
    detail: `${cfg.authority.toBase58()} (expected ${EXPECTED_AUTHORITY})`,
  });

  checks.push({
    ok: cfg.attestor.toBase58() === EXPECTED_ATTESTOR,
    label: "Config.attestor matches mainnet attestor",
    detail: `${cfg.attestor.toBase58()} (expected ${EXPECTED_ATTESTOR})`,
  });

  checks.push({
    ok: cfg.wxrpMint.toBase58() === EXPECTED_WXRP_MINT,
    label: "Config.wxrp_mint pinned",
    detail: `${cfg.wxrpMint.toBase58()}`,
  });

  checks.push({
    ok: cfg.yxrpMint.toBase58() === EXPECTED_YXRP_MINT,
    label: "Config.yxrp_mint pinned",
    detail: `${cfg.yxrpMint.toBase58()}`,
  });

  const maxSingle = BigInt(cfg.maxSingleDeposit.toString());
  checks.push({
    ok: maxSingle === EXPECTED_MAX_SINGLE_DEPOSIT,
    label: "Config.max_single_deposit == Beta-0 cap",
    detail: `${maxSingle} (expected ${EXPECTED_MAX_SINGLE_DEPOSIT})`,
  });

  // Aggregate position state. Position is a fixed-size account; we filter
  // getProgramAccounts by the Anchor discriminator (first 8 bytes).
  const positionDiscriminator = Buffer.from([
    // sha256("account:Position")[0..8] — precomputed, stable across builds
    170, 188, 143, 228, 122, 64, 247, 208,
  ]);
  const positions = await conn.getProgramAccounts(PROGRAM_ID, {
    filters: [
      { memcmp: { offset: 0, bytes: positionDiscriminator.toString("base64"), encoding: "base64" } as any },
    ],
  });
  let sumPrincipal = 0n;
  let sumReceiptSupply = 0n;
  for (const { pubkey } of positions) {
    const p = await (program.account as any).position.fetch(pubkey);
    sumPrincipal += BigInt(p.principal.toString());
    sumReceiptSupply += BigInt(p.receiptSupply.toString());
  }

  const vault = await getAccount(conn, vaultPda).catch(() => null);
  const vaultBalance = vault ? BigInt(vault.amount.toString()) : 0n;

  // Invariant I5 aggregate — only valid while Phase B (wXRP parked in vault).
  // After Phase C lands this check needs updating to include
  // (Kamino obligation deposited_amount + accrued_interest).
  checks.push({
    ok: sumPrincipal === vaultBalance,
    label: "sum(Position.principal) == vault_wxrp.amount  [Phase-B aggregate]",
    detail: `principal=${sumPrincipal}  vault=${vaultBalance}  positions=${positions.length}`,
  });

  const yxrpMint = await getMint(conn, cfg.yxrpMint);
  const yxrpSupply = BigInt(yxrpMint.supply.toString());
  checks.push({
    ok: yxrpSupply === sumReceiptSupply,
    label: "yXRP mint supply == sum(Position.receipt_supply)",
    detail: `yxrp_supply=${yxrpSupply}  sum_receipts=${sumReceiptSupply}`,
  });

  const failures = checks.filter((c) => !c.ok);
  const ok = failures.length === 0;

  console.log(`[${new Date().toISOString()}] Beta-0 watch — ${ok ? "HEALTHY" : "FAILING"}`);
  for (const c of checks) {
    console.log(`  ${c.ok ? "✓" : "✗"} ${c.label}`);
    console.log(`      ${c.detail}`);
  }

  if (!ok) {
    await alertWebhook(failures);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error("watch-mainnet error:", err);
  process.exit(1);
});
