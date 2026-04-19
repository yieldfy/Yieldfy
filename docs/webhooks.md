# Webhooks

The optimizer dispatches a fire-and-forget webhook to every subscription that matches an event. Deliveries carry an HMAC-SHA256 signature so receivers can verify authenticity.

## Events

| Event                 | Fired when                                        | Payload shape                            |
| --------------------- | ------------------------------------------------- | ---------------------------------------- |
| `attestation.created` | `/attest` successfully signs a venue attestation. | `{ profile, slot, winner, attestation, corrId }` |

## Delivery headers

Every POST carries:

| Header                      | Value                                                                |
| --------------------------- | -------------------------------------------------------------------- |
| `Content-Type`              | `application/json`                                                   |
| `X-Yieldfy-Event`           | Event name, e.g. `attestation.created`.                              |
| `X-Yieldfy-Delivery`        | UUID unique to this delivery. Safe to idempotency-key on.            |
| `X-Yieldfy-Correlation-Id`  | Traces back to the originating `/attest` request.                    |
| `X-Yieldfy-Signature`       | `sha256=<hex>` — `HMAC-SHA256(body, subscription.secret)`.           |

## Body envelope

```json
{
  "event": "attestation.created",
  "payload": {
    "profile": "balanced",
    "slot": "456613541",
    "corrId": "5f9d2b3e-…",
    "winner": {
      "venue": "kamino",
      "score": 0.208,
      "snapshot": { "venue": "kamino", "apy": 0, "tvlUsd": 0, "utilization": 0, "oracleAgeSec": 10, "auditScore": 0.92 }
    },
    "attestation": {
      "venue": "kamino",
      "venueCode": 0,
      "slot": "456613541",
      "sigHex": "51433866a484…",
      "pubkeyBase58": "Aoh2719df3HDRPKmrqgTBjh7GNFN8WwXWJuMgo6iwEAT"
    }
  },
  "corrId": "5f9d2b3e-…",
  "ts": 1776602874537
}
```

## Verifying the signature

### Node

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verify(rawBody: string, secret: string, header: string): boolean {
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

Wire it into your handler before parsing JSON — use the raw body bytes, not the re-serialized object.

### Edge / Web Crypto

```ts
const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(secret),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"],
);
const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
const expected = "sha256=" + Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
```

## Timeouts and retries

- Per-delivery timeout: **5 s**. Respond fast; do heavy work async.
- **No retries in v1.** If a delivery fails, the counter `yieldfy_webhook_dispatch_total{status="err"}` increments — Grafana surfaces it on the "Webhook dispatch success rate" panel. Reliable delivery (queued retries) ships with Phase 9-plus.

## Subscription management

```bash
# List
curl https://optimizer.yieldfy.ai/webhooks

# Delete
curl -X DELETE https://optimizer.yieldfy.ai/webhooks/<id>
```

Subscriptions are currently in-memory — they do **not** persist across optimizer restarts. Moving to Redis / Postgres is a follow-up; until then, re-register on reconnect.
