# Observability

Three pillars, one correlation ID. Every request through the Yieldfy stack carries an `x-correlation-id` so logs, metrics, and events can be joined across services.

## Correlation IDs

- Clients may pass `X-Correlation-Id: <string>` (≤ 128 chars). The optimizer echoes it on the response header and uses it as the Fastify request id.
- Missing or oversized values are replaced by a server-generated UUID v4.
- Webhook deliveries forward the same id via `X-Yieldfy-Correlation-Id`, and embed `corrId` in the JSON body.
- Axiom events include `corrId`; Prometheus does not (high-cardinality).

Typical flow:

```
dashboard ─X-Correlation-Id─▶ optimizer.attest ─┐
                                                 ├─▶ structured log line (corrId)
                                                 ├─▶ axiom event ingest (corrId)
                                                 └─▶ webhook POST (X-Yieldfy-Correlation-Id + corrId in body)
```

## Metrics (Prometheus)

Scraped from `/metrics` on the optimizer. Labels include `service="yieldfy-optimizer"` by default.

| Metric                                           | Type      | Labels              | Notes                                          |
| ------------------------------------------------ | --------- | ------------------- | ---------------------------------------------- |
| `yieldfy_attestations_total`                     | counter   | `venue`, `profile`  | Signed attestations, by winning venue + profile. |
| `yieldfy_attestation_duration_seconds`           | histogram | `profile`           | End-to-end `/attest` latency.                  |
| `yieldfy_feeds_fetch_duration_seconds`           | histogram | —                   | DeFiLlama fetch latency.                       |
| `yieldfy_webhook_dispatch_total`                 | counter   | `status`, `event`   | Dispatch attempts; status is `2xx`/`3xx`/`4xx`/`5xx`/`err`. |
| `process_*` (defaults)                           | various   | —                   | CPU, memory, event loop lag.                   |

### Scrape config

```yaml
scrape_configs:
  - job_name: yieldfy-optimizer
    metrics_path: /metrics
    static_configs:
      - targets: ["optimizer:4000"]
```

Full example in [`ops/prometheus/prometheus.yml`](../ops/prometheus/prometheus.yml).

## Grafana

Import [`ops/grafana/yieldfy-optimizer.json`](../ops/grafana/yieldfy-optimizer.json) via *Dashboards → Import → Upload JSON*. Pick your Prometheus data source for the `DS_PROMETHEUS` variable.

Panels:
1. **Attestations / min** — `rate(yieldfy_attestations_total[5m]) * 60` by venue.
2. **Attestation latency p50 / p95 / p99** — `histogram_quantile` over `yieldfy_attestation_duration_seconds_bucket`, split by profile.
3. **Chosen venue share** — pie of cumulative attestations.
4. **DeFiLlama fetch p95** — upstream latency tracker.
5. **Webhook dispatch success rate** — stat panel, green ≥ 99 %, yellow ≥ 95 %, red below.
6. **Process CPU** — `rate(process_cpu_seconds_total[1m])`.
7. **Resident memory** — `process_resident_memory_bytes`.

## Axiom (structured events)

Set on the optimizer:

```bash
export AXIOM_TOKEN=xaat-your-token
export AXIOM_DATASET=yieldfy-optimizer-prod
export AXIOM_ORG_ID=your-org   # optional, for org-scoped tokens
```

Every `logEvent()` call fires a non-blocking POST to `https://api.axiom.co/v1/datasets/<dataset>/ingest` with `_time` set from the event. Shipped by default:

- `attestation.created` — when `/attest` succeeds.
- `webhook.subscribed` — new subscription created.
- `webhook.unsubscribed` — subscription removed.

APL query example:

```
['yieldfy-optimizer-prod']
| where event == "attestation.created"
| summarize count() by profile, venue, bin(_time, 1h)
```

When Axiom is not configured the POSTs are skipped — local Fastify log lines remain. Dev environments can inspect events with `npm run dev` and tail the terminal.
