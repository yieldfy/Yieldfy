import Fastify from "fastify";
import { Connection } from "@solana/web3.js";
import { fetchSnapshots } from "./feeds.js";
import { chooseVenue, type RiskProfile } from "./score.js";
import { signAttestation, attestorPubkey } from "./attest.js";
import {
  registry,
  attestationsTotal,
  attestationDuration,
  feedsFetchDuration,
} from "./metrics.js";
import {
  createSubscription,
  deleteSubscription,
  dispatchEvent,
  listSubscriptions,
  type WebhookEvent,
} from "./webhooks.js";
import {
  CORRELATION_ID_HEADER,
  axiomConfigured,
  getCorrelationId,
  logEvent,
} from "./observability.js";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";
const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

const PROFILES = ["conservative", "balanced", "opportunistic"] as const;
const isProfile = (s: string): s is RiskProfile =>
  (PROFILES as readonly string[]).includes(s);

const app = Fastify({
  logger: true,
  genReqId: (req) => getCorrelationId(req.headers as Record<string, unknown>),
});
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

app.addHook("onRequest", async (req, reply) => {
  reply.header(CORRELATION_ID_HEADER, req.id);
});

app.get("/health", async () => ({ ok: true, ts: Date.now() }));

app.get("/attestor/pubkey", async () => ({ pubkey: attestorPubkey }));

app.get("/metrics", async (_req, reply) => {
  reply.type(registry.contentType);
  return registry.metrics();
});

app.get("/venues", async () => {
  const stop = feedsFetchDuration.startTimer();
  try {
    const snaps = await fetchSnapshots();
    return { venues: snaps };
  } finally {
    stop();
  }
});

app.get("/choose", async (req) => {
  const profile = (req.query as { profile?: string }).profile ?? "balanced";
  if (!isProfile(profile)) {
    throw new Error(`Invalid profile: ${profile}`);
  }
  const snaps = await fetchSnapshots();
  const winner = chooseVenue(snaps, profile);
  return {
    profile,
    winner: { venue: winner.s.venue, score: winner.score, snapshot: winner.s },
  };
});

app.get("/attest", async (req, reply) => {
  const corrId = req.id;
  const profile = (req.query as { profile?: string }).profile ?? "balanced";
  if (!isProfile(profile)) {
    reply.code(400);
    return { error: `Invalid profile: ${profile}`, corrId };
  }

  const stop = attestationDuration.startTimer({ profile });
  try {
    const fetchStop = feedsFetchDuration.startTimer();
    const [snaps, slot] = await Promise.all([
      fetchSnapshots().finally(fetchStop),
      connection.getSlot(),
    ]);
    const winner = chooseVenue(snaps, profile);
    const attestation = signAttestation(winner.s.venue, BigInt(slot));

    attestationsTotal.inc({ venue: winner.s.venue, profile });

    const response = {
      profile,
      slot: slot.toString(),
      corrId,
      winner: {
        venue: winner.s.venue,
        score: winner.score,
        snapshot: winner.s,
      },
      attestation,
    };

    logEvent(app.log, {
      event: "attestation.created",
      corrId,
      profile,
      venue: winner.s.venue,
      score: winner.score,
      slot: slot.toString(),
    });

    dispatchEvent("attestation.created", response, { corrId });

    return response;
  } finally {
    stop();
  }
});

app.get("/webhooks", async () => ({ subscriptions: listSubscriptions() }));

app.post("/webhooks", async (req, reply) => {
  const body = req.body as {
    url?: string;
    events?: WebhookEvent[];
    secret?: string;
  };
  if (!body?.url || !Array.isArray(body?.events) || body.events.length === 0) {
    reply.code(400);
    return { error: "Body must include { url, events: WebhookEvent[] }" };
  }
  try {
    const sub = createSubscription(body.url, body.events, body.secret);
    logEvent(app.log, {
      event: "webhook.subscribed",
      corrId: req.id,
      subscriptionId: sub.id,
      url: sub.url,
    });
    return sub;
  } catch (e) {
    reply.code(400);
    return { error: e instanceof Error ? e.message : String(e) };
  }
});

app.delete<{ Params: { id: string } }>("/webhooks/:id", async (req, reply) => {
  const ok = deleteSubscription(req.params.id);
  if (!ok) {
    reply.code(404);
    return { error: "subscription not found" };
  }
  logEvent(app.log, {
    event: "webhook.unsubscribed",
    corrId: req.id,
    subscriptionId: req.params.id,
  });
  return { ok: true };
});

app
  .listen({ port: PORT, host: HOST })
  .then(() => {
    app.log.info(`attestor pubkey: ${attestorPubkey}`);
    app.log.info(`solana rpc: ${SOLANA_RPC_URL}`);
    app.log.info(`axiom ingest: ${axiomConfigured ? "enabled" : "disabled"}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
