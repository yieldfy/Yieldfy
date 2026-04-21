import { collectDefaultMetrics, Counter, Gauge, Registry } from "prom-client";

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const supplyGauge = new Gauge({
  name: "yieldfy_wxrp_supply",
  help: "Current wXRP total supply (base units)",
  registers: [registry],
});

export const mintTotal = new Counter({
  name: "yieldfy_wxrp_mint_total",
  help: "Cumulative wXRP mint deltas since indexer start (base units)",
  registers: [registry],
});

export const burnTotal = new Counter({
  name: "yieldfy_wxrp_burn_total",
  help: "Cumulative wXRP burn deltas since indexer start (base units)",
  registers: [registry],
});

export const pollErrors = new Counter({
  name: "yieldfy_wxrp_poll_errors_total",
  help: "Number of supply-poll failures",
  registers: [registry],
});
