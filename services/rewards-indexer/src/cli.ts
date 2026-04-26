/**
 * CLI for ad-hoc epoch runs. Useful for testing pre-launch and for cron'd
 * production runs that don't want the HTTP server's idempotency check.
 *
 *   tsx src/cli.ts run         — fetch live state and publish a new epoch
 *   tsx src/cli.ts list        — print the IDs we have on disk
 *   tsx src/cli.ts show <id>   — pretty-print a stored epoch
 */

import { Connection } from "@solana/web3.js";
import { env } from "./env.js";
import { runEpoch } from "./epoch.js";
import { EpochStorage } from "./storage.js";

async function main() {
  const [, , cmd, arg] = process.argv;
  const storage = new EpochStorage(env.STORAGE_DIR);
  await storage.ensureDir();

  switch (cmd) {
    case "run": {
      const conn = new Connection(env.SOLANA_RPC_URL, "confirmed");
      const result = await runEpoch({
        conn,
        storage,
        yieldfyMint: env.YIELDFY_MINT ?? null,
        yieldfySupply: env.YIELDFY_SUPPLY,
        yieldfyDecimals: 6,
        wxrpMint: env.WXRP_MINT,
        yieldfyProgramId: env.YIELDFY_PROGRAM_ID,
        paramOverrides: {
          ...(env.ALPHA != null && { alpha: env.ALPHA }),
          ...(env.BETA != null && { beta: env.BETA }),
          ...(env.DISTRIBUTION_RATE != null && {
            distributionRatePerEpoch: env.DISTRIBUTION_RATE,
          }),
        },
      });
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({
        epochId: result.epochId,
        merkleRoot: result.merkleRoot,
        participants: result.participants,
        poolSol: result.poolSol,
        marketCapUsd: result.marketCapUsd,
      }, null, 2));
      return;
    }
    case "list": {
      const ids = await storage.listEpochIds();
      // eslint-disable-next-line no-console
      console.log(ids.join("\n"));
      return;
    }
    case "show": {
      const id = Number(arg);
      if (!Number.isFinite(id)) throw new Error("bad epoch id");
      const result = await storage.read(id);
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    default:
      // eslint-disable-next-line no-console
      console.error("usage: cli.ts run | list | show <id>");
      process.exit(2);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
