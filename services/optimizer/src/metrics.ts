import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export const registry = new Registry();
registry.setDefaultLabels({ service: "yieldfy-optimizer" });

collectDefaultMetrics({ register: registry });

export const attestationsTotal = new Counter({
  name: "yieldfy_attestations_total",
  help: "Attestations signed, by winning venue and requested risk profile.",
  labelNames: ["venue", "profile"] as const,
  registers: [registry],
});

export const attestationDuration = new Histogram({
  name: "yieldfy_attestation_duration_seconds",
  help: "End-to-end duration of /attest handling (fetch + score + slot + sign).",
  labelNames: ["profile"] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

export const feedsFetchDuration = new Histogram({
  name: "yieldfy_feeds_fetch_duration_seconds",
  help: "Duration of the DeFiLlama snapshot fetch.",
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

export const webhookDispatchTotal = new Counter({
  name: "yieldfy_webhook_dispatch_total",
  help: "Webhook POST attempts, by HTTP status class.",
  labelNames: ["status", "event"] as const,
  registers: [registry],
});
