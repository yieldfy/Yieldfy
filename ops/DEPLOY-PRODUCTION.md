# Production deploy runbook · DigitalOcean + Vercel

Target topology:

```
yieldfy.ai            ─► Vercel (static SPA from apps/dashboard)
optimizer.yieldfy.ai  ─► DigitalOcean App Platform (services/optimizer)
indexer.yieldfy.ai    ─► DigitalOcean App Platform (services/wxrp-indexer)
                      │
                      └─► DO Managed Redis (webhook subscription store)
```

Estimated bill at dev-tier: **$12/mo (optimizer) + $5/mo (indexer) + $15/mo (Redis)** = **~$32/mo**. Vercel stays free until traffic scales.

---

## One-time setup

### 1. DigitalOcean account

- Create a [DigitalOcean](https://cloud.digitalocean.com) account.
- Attach a payment method.
- Create a [personal access token](https://cloud.digitalocean.com/account/api/tokens) with read + write scopes. Save it as `DIGITALOCEAN_ACCESS_TOKEN`.

### 2. `doctl` CLI (local)

```sh
brew install doctl
doctl auth init --access-token "$DIGITALOCEAN_ACCESS_TOKEN"
doctl account get                # sanity check
```

### 3. Link GitHub to DO App Platform

In the DO dashboard → Apps → Create app → Connect to GitHub → authorize the `yieldfy` org (one-time, needs GitHub admin on the org). Pick the `Yieldfy` repo. This is required before `doctl apps create --spec` will work against a GitHub source.

### 4. DNS at yieldfy.ai

We terminate SSL at DO and Vercel, so you just need CNAMEs:

| Hostname | Record | Target |
| --- | --- | --- |
| `yieldfy.ai`, `www.yieldfy.ai` | `A` / `CNAME` | (already set for Vercel) |
| `optimizer.yieldfy.ai` | `CNAME` | `<app-id>.ondigitalocean.app` (printed by `doctl apps create`) |
| `indexer.yieldfy.ai` | `CNAME` | `<app-id>.ondigitalocean.app` |

DO issues a Let's Encrypt cert automatically once DNS resolves.

### 5. Secrets

The optimizer needs two real secrets. Put them in the DO app via the UI or `doctl`:

```sh
# Attestor key (same file used for devnet — in production, issue a fresh one
# and rotate Config.attestor on-chain via `rotate_attestor` ix)
doctl apps update <APP-ID> --spec .do/optimizer.app.yaml \
  --update-sources=false

# Then edit the app in the UI to paste the secret values, OR use
# doctl apps update-secret with the API once that command lands.
```

The Redis `REDIS_URL` is wired via `${redis.REDIS_URL}` interpolation — the App Platform sets it automatically once the `databases:` block provisions the cluster.

### 6. First deploy

```sh
doctl apps create --spec .do/optimizer.app.yaml
doctl apps create --spec .do/wxrp-indexer.app.yaml

# Capture the app IDs returned, save them:
doctl apps list
```

Subsequent deploys are **driven by GitHub Actions on tag push** — see the next section.

---

## Continuous deploy

On every `v*` or `sdk-v*` tag push to `main`, `.github/workflows/deploy-do.yml` (ships in the same PR as this runbook) calls `doctl apps create-deployment <app-id>` for both apps. The tag must match the committed spec, so tag + commit are atomic.

Required repo secret:

- `DIGITALOCEAN_ACCESS_TOKEN` — the same token as step 1.

Optional repo variables (so the workflow knows which apps to redeploy):

- `DO_APP_OPTIMIZER_ID` — app ID from `doctl apps list`
- `DO_APP_INDEXER_ID`

If these variables aren't set, the workflow falls back to `doctl apps list --format ID,Spec.Name` and picks by name. Slower, but zero-config.

---

## Rotating the attestor key (post-launch)

1. `solana-keygen new -o ops/artifacts/prod/attestor.new.json`
2. Call `rotate_attestor(new_pubkey)` on-chain as the Config authority.
3. Replace the `YIELDFY_ATTESTOR_KEY` env var in the DO app with the new JSON byte array. Hit save — App Platform performs a zero-downtime rolling replace.
4. Verify `curl https://optimizer.yieldfy.ai/attestor/pubkey` matches the new key.

Do not delete the old key for 24h — any in-flight attestations signed with it still need to clear the staleness window on-chain.

---

## Pre-launch checklist

- [ ] DNS CNAMEs resolve for `optimizer.yieldfy.ai` + `indexer.yieldfy.ai`.
- [ ] `curl https://optimizer.yieldfy.ai/health` → `{ok:true}`.
- [ ] `curl https://optimizer.yieldfy.ai/attestor/pubkey` → matches `Config.attestor` on-chain (currently `76XD6xfJhXoH7HhyywhTvkX5RT1etAoot3HN4AF1wHXb` for devnet).
- [ ] `curl https://indexer.yieldfy.ai/supply` → returns a snapshot.
- [ ] Vercel env has `VITE_OPTIMIZER_URL=https://optimizer.yieldfy.ai`.
- [ ] `CORS_ORIGIN=https://yieldfy.ai` on the optimizer; `curl -H "Origin: https://yieldfy.ai" …/attestor/pubkey -i` returns `Access-Control-Allow-Origin: https://yieldfy.ai`.
- [ ] Rate limit on `/attest` smoke-tested (100 requests → 40 of them return 429).
- [ ] Prometheus `/metrics` endpoint reachable (optionally scraped by Grafana Cloud).
- [ ] A dashboard deposit from a fresh wallet lands end-to-end on devnet.

## Rollback

```sh
# List deployments and roll back to the previous good one
doctl apps list-deployments <APP-ID>
doctl apps create-deployment <APP-ID> --rollback <DEPLOYMENT-ID>
```

Redis state persists across rollbacks. On-chain program is unaffected by any App Platform change.
