# ops/

Runbooks, terraform, and observability assets. Currently tracks scaffolding only — expand as phases land.

## Layout

```
ops/
├── grafana/
│   └── yieldfy-optimizer.json   # Grafana dashboard — import via Dashboards → Import
└── prometheus/
    └── prometheus.yml           # example scrape config targeting the optimizer
```

## Grafana dashboard

**Import:** Grafana UI → *Dashboards → Import → Upload JSON file* → select `ops/grafana/yieldfy-optimizer.json` → choose your Prometheus data source for the `DS_PROMETHEUS` variable.

**Panels:**
- Attestations per minute by venue.
- Attestation latency p50 / p95 / p99 (per risk profile).
- Chosen venue share (pie).
- DeFiLlama fetch p95.
- Webhook dispatch success rate (2xx / total).
- Process CPU + resident memory.

## Prometheus

Minimum scrape config is in `prometheus/prometheus.yml`. Adjust `targets:` to match your optimizer's host/port. In Kubernetes, replace with a `ServiceMonitor` that selects `service: yieldfy-optimizer`.

## Axiom (structured event stream)

Set `AXIOM_TOKEN` and `AXIOM_DATASET` (optionally `AXIOM_ORG_ID`) on the optimizer. When configured, every `logEvent()` call fires a non-blocking POST to `https://api.axiom.co/v1/datasets/<dataset>/ingest`. Correlation IDs flow through as `corrId` so events can be joined across the SDK, optimizer, and eventually the Anchor program.
