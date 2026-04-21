import Fastify from "fastify";
import { Connection, PublicKey } from "@solana/web3.js";
import { env } from "./env.js";
import { readSupply, diff, type SupplySnapshot } from "./supply.js";
import {
  burnTotal,
  mintTotal,
  pollErrors,
  registry,
  supplyGauge,
} from "./metrics.js";

const app = Fastify({ logger: { level: "info" } });
const conn = new Connection(env.SOLANA_RPC_URL, "confirmed");
const mint = new PublicKey(env.WXRP_MINT);

let last: SupplySnapshot | null = null;

app.get("/health", async () => ({ ok: true }));

app.get("/supply", async () => {
  if (!last) {
    return { ready: false };
  }
  return {
    ready: true,
    slot: last.slot,
    supply: last.supplyRaw.toString(),
    decimals: last.decimals,
    ts: last.ts,
  };
});

app.get("/metrics", async (_, reply) => {
  reply.header("Content-Type", registry.contentType);
  return registry.metrics();
});

async function tick() {
  try {
    const snap = await readSupply(conn, mint);
    supplyGauge.set(Number(snap.supplyRaw));
    if (last) {
      const d = diff(last, snap);
      if (d.diffRaw > 0n) {
        mintTotal.inc(Number(d.diffRaw));
        app.log.info(
          {
            event: "wxrp.mint",
            slot: snap.slot,
            amount: d.diffRaw.toString(),
            supply: snap.supplyRaw.toString(),
          },
          "wxrp mint observed",
        );
      } else if (d.diffRaw < 0n) {
        burnTotal.inc(Number(-d.diffRaw));
        app.log.info(
          {
            event: "wxrp.burn",
            slot: snap.slot,
            amount: (-d.diffRaw).toString(),
            supply: snap.supplyRaw.toString(),
          },
          "wxrp burn observed",
        );
      }
    }
    last = snap;
  } catch (err) {
    pollErrors.inc();
    app.log.error({ err }, "supply poll failed");
  }
}

let timer: NodeJS.Timeout | null = null;

export async function start() {
  await tick();
  timer = setInterval(tick, env.POLL_MS);
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  app.log.info(
    `wxrp-indexer on :${env.PORT}, polling ${mint.toBase58()} every ${env.POLL_MS}ms`,
  );
}

async function shutdown() {
  if (timer) clearInterval(timer);
  await app.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch((err) => {
    app.log.error({ err }, "startup failed");
    process.exit(1);
  });
}
