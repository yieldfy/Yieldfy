# ops/

Runbooks, terraform, and observability assets. Currently tracks scaffolding only — expand as phases land.

## Layout

```
ops/
├── grafana/
│   ├── yieldfy-optimizer.json          # Grafana dashboard
│   └── provisioning/                   # auto-loaded by the compose stack
│       ├── datasources/prometheus.yml
│       └── dashboards/dashboards.yml
└── prometheus/
    └── prometheus.yml                  # scrape config targeting the optimizer
```

## Local observability stack

One command brings up optimizer + Redis + Prometheus + Grafana, all pre-wired:

```bash
docker compose up --build
```

| Service    | URL                    | Notes                                                      |
| ---------- | ---------------------- | ---------------------------------------------------------- |
| Optimizer  | http://localhost:4000  | Built from `services/optimizer/Dockerfile`.                 |
| Redis      | `redis://localhost:6379` | Backs the optimizer's webhook subscription store.         |
| Prometheus | http://localhost:9090  | Scrapes `optimizer:4000/metrics` every 15 s.                |
| Grafana    | http://localhost:3030  | Anonymous-admin by default. Dashboard auto-provisioned under *Yieldfy*. |

Stop everything with `docker compose down`; add `-v` to drop Grafana/Prometheus volumes.

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
