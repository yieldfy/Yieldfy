import Fastify from "fastify";
import { fetchSnapshots } from "./feeds.js";
import { chooseVenue, type RiskProfile } from "./score.js";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true, ts: Date.now() }));

app.get("/venues", async () => {
  const snaps = await fetchSnapshots();
  return { venues: snaps };
});

app.get("/choose", async (req) => {
  const profile = (req.query as { profile?: string }).profile ?? "balanced";
  if (!["conservative", "balanced", "opportunistic"].includes(profile)) {
    throw new Error(`Invalid profile: ${profile}`);
  }
  const snaps = await fetchSnapshots();
  const winner = chooseVenue(snaps, profile as RiskProfile);
  return {
    profile,
    winner: {
      venue: winner.s.venue,
      score: winner.score,
      snapshot: winner.s,
    },
  };
});

// /attest lands in Phase 4 once the ed25519 signer is wired.
app.get("/attest", async () => ({
  error: "Not implemented",
  hint: "Attestation signer ships in Phase 4.",
}));

app.listen({ port: PORT, host: HOST }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
