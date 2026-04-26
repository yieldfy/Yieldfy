/**
 * Read-only HTTP API over the persisted epoch store. The indexer process
 * runs runEpoch on the configured cadence; this server just exposes results.
 *
 *   GET  /health                  → liveness
 *   GET  /epoch/latest            → most recent published epoch
 *   GET  /epoch/:id               → specific epoch
 *   GET  /claim/:wallet           → wallet's claim from latest epoch (if any)
 *   GET  /claim/:wallet/:epochId  → wallet's claim from a specific epoch
 *   GET  /metrics                 → prometheus
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { register, Counter, Gauge } from "prom-client";
import { env } from "./env.js";
import { runEpoch } from "./epoch.js";
import {
  loadProposerKeypair,
  publishEpochToSaber,
  type PublisherConfig,
} from "./saber-publisher.js";
import { EpochStorage } from "./storage.js";

const epochCount = new Counter({
  name: "yieldfy_rewards_epoch_published_total",
  help: "Number of epochs successfully published.",
});
const lastEpochPoolSol = new Gauge({
  name: "yieldfy_rewards_last_pool_sol",
  help: "SOL distributed in the most recent epoch.",
});
const lastEpochParticipants = new Gauge({
  name: "yieldfy_rewards_last_participants",
  help: "Wallet count in the most recent snapshot.",
});
const publishCount = new Counter({
  name: "yieldfy_rewards_publish_proposed_total",
  help: "Squads vault transaction proposals successfully created.",
});

async function loadPublisherConfig(): Promise<PublisherConfig | null> {
  if (!env.SQUADS_MULTISIG_PDA) return null;
  if (!env.SQUADS_PROPOSER_KEYPAIR_PATH && !env.SQUADS_PROPOSER_KEYPAIR_JSON) {
    return null;
  }
  const proposer: Keypair = await loadProposerKeypair({
    path: env.SQUADS_PROPOSER_KEYPAIR_PATH,
    inlineJson: env.SQUADS_PROPOSER_KEYPAIR_JSON,
  });
  return {
    multisigPda: new PublicKey(env.SQUADS_MULTISIG_PDA),
    vaultIndex: env.SQUADS_VAULT_INDEX,
    proposer,
  };
}

async function main() {
  const fastify = Fastify({ logger: true });
  // Allow the dashboard (production + previews + local dev) to read claim
  // proofs cross-origin. Same-origin server-to-server callers (no Origin
  // header — curl, indexer cron, etc.) are passed through.
  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const ok =
        origin === "https://www.yieldfy.ai" ||
        origin === "https://yieldfy.ai" ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^https:\/\/yieldfypriv-[a-z0-9-]+\.vercel\.app$/.test(origin);
      cb(null, ok);
    },
    methods: ["GET", "POST"],
  });
  const conn = new Connection(env.SOLANA_RPC_URL, "confirmed");
  const storage = new EpochStorage(env.STORAGE_DIR);
  await storage.ensureDir();
  const publisherConfig = await loadPublisherConfig();
  fastify.log.info(
    publisherConfig
      ? `[publisher] Squads configured · multisig=${publisherConfig.multisigPda.toBase58()} vault=${publisherConfig.vaultIndex}`
      : "[publisher] Squads not configured — /admin/publish-epoch disabled",
  );

  fastify.get("/health", async () => ({ ok: true }));

  fastify.get("/metrics", async (_req, reply) => {
    reply.header("content-type", register.contentType);
    return register.metrics();
  });

  fastify.get("/epoch/latest", async (_req, reply) => {
    const result = await storage.readLatest();
    if (!result) return reply.status(404).send({ error: "no epoch published yet" });
    return result;
  });

  fastify.get<{ Params: { id: string } }>("/epoch/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.status(400).send({ error: "bad epoch id" });
    const result = await storage.read(id);
    if (!result) return reply.status(404).send({ error: "no such epoch" });
    return result;
  });

  fastify.get<{ Params: { wallet: string } }>("/claim/:wallet", async (req, reply) => {
    const result = await storage.readLatest();
    if (!result) return reply.status(404).send({ error: "no epoch published yet" });
    const claim = result.claims[req.params.wallet];
    if (!claim) return reply.status(404).send({ error: "no claim for this wallet in latest epoch" });
    return {
      epochId: result.epochId,
      merkleRoot: result.merkleRoot,
      saberDistributor: result.saberDistributor,
      wallet: req.params.wallet,
      ...claim,
    };
  });

  fastify.get<{ Params: { wallet: string; epochId: string } }>(
    "/claim/:wallet/:epochId",
    async (req, reply) => {
      const id = Number(req.params.epochId);
      if (!Number.isFinite(id)) return reply.status(400).send({ error: "bad epoch id" });
      const result = await storage.read(id);
      if (!result) return reply.status(404).send({ error: "no such epoch" });
      const claim = result.claims[req.params.wallet];
      if (!claim) return reply.status(404).send({ error: "no claim in this epoch" });
      return {
        epochId: result.epochId,
        merkleRoot: result.merkleRoot,
        wallet: req.params.wallet,
        ...claim,
      };
    },
  );

  fastify.post<{ Params: { id?: string } }>(
    "/admin/publish-epoch/:id?",
    async (req, reply) => {
      if (!publisherConfig) {
        return reply.status(503).send({
          error:
            "publisher not configured — set SQUADS_MULTISIG_PDA + SQUADS_PROPOSER_KEYPAIR_(PATH|JSON)",
        });
      }
      const epoch =
        req.params.id !== undefined
          ? await storage.read(Number(req.params.id))
          : await storage.readLatest();
      if (!epoch) return reply.status(404).send({ error: "no such epoch" });

      const result = await publishEpochToSaber({
        conn,
        epoch,
        storage,
        config: publisherConfig,
      });
      if (result.status === "proposed") publishCount.inc();
      return result;
    },
  );

  // Trigger an epoch immediately on startup (idempotent: refuses if last
  // published epoch is younger than EPOCH_HOURS).
  fastify.post("/admin/run-epoch", async (_req, reply) => {
    const last = await storage.readLatest();
    const minIntervalMs = env.EPOCH_HOURS * 3_600_000;
    if (last && Date.now() - last.endedAt < minIntervalMs) {
      return reply
        .status(409)
        .send({ error: "last epoch too recent", lastEpochId: last.epochId });
    }
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
        ...(env.DISTRIBUTION_RATE != null && { distributionRatePerEpoch: env.DISTRIBUTION_RATE }),
      },
    });
    epochCount.inc();
    lastEpochPoolSol.set(result.poolSol);
    lastEpochParticipants.set(result.participants);
    return { ok: true, epochId: result.epochId, participants: result.participants };
  });

  await fastify.listen({ host: env.HOST, port: env.PORT });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
