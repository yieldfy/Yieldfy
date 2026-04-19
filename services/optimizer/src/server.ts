import Fastify from "fastify";
import { Connection } from "@solana/web3.js";
import { fetchSnapshots } from "./feeds.js";
import { chooseVenue, type RiskProfile } from "./score.js";
import { signAttestation, attestorPubkey } from "./attest.js";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";
const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

const PROFILES = ["conservative", "balanced", "opportunistic"] as const;
const isProfile = (s: string): s is RiskProfile =>
  (PROFILES as readonly string[]).includes(s);

const app = Fastify({ logger: true });
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

app.get("/health", async () => ({ ok: true, ts: Date.now() }));

app.get("/attestor/pubkey", async () => ({ pubkey: attestorPubkey }));

app.get("/venues", async () => {
  const snaps = await fetchSnapshots();
  return { venues: snaps };
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
  const profile = (req.query as { profile?: string }).profile ?? "balanced";
  if (!isProfile(profile)) {
    reply.code(400);
    return { error: `Invalid profile: ${profile}` };
  }

  const [snaps, slot] = await Promise.all([
    fetchSnapshots(),
    connection.getSlot(),
  ]);
  const winner = chooseVenue(snaps, profile);
  const attestation = signAttestation(winner.s.venue, BigInt(slot));

  return {
    profile,
    slot: slot.toString(),
    winner: {
      venue: winner.s.venue,
      score: winner.score,
      snapshot: winner.s,
    },
    attestation,
  };
});

app
  .listen({ port: PORT, host: HOST })
  .then(() => {
    app.log.info(`attestor pubkey: ${attestorPubkey}`);
    app.log.info(`solana rpc: ${SOLANA_RPC_URL}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
