# Production deploy · topology & runbook

Two repos, three hosted surfaces:

```
github.com/yieldfy/Yieldfy           (public — this repo)
  └─ apps/dashboard                  ─►  Vercel  ─►  yieldfy.ai

github.com/yieldfy/yieldfy-api       (private — backend source of truth)
  └─ @yieldfy/api                    ─►  DigitalOcean App Platform
                                           ─►  optimizer.yieldfy.ai
```

| Surface | Repo | Host | Cost |
| --- | --- | --- | --- |
| Dashboard (`yieldfy.ai`) | `yieldfy/Yieldfy` | Vercel | $0 (Hobby) |
| Optimizer (`optimizer.yieldfy.ai`) | `yieldfy/yieldfy-api` | DO App Platform basic-xxs | $5/mo |
| Solana program | `yieldfy/Yieldfy` | Solana devnet | ~2.5 SOL one-time |

**No managed Redis.** Webhook subscriptions fall back to the in-memory store; good enough until we need persistence.

**No wXRP indexer in production yet.** Only needed when we move to mainnet for Hex Trust mint/burn reconciliation. Lives in `services/wxrp-indexer/` ready to deploy when that day comes.

---

## One-time setup

### 1. DigitalOcean account

- Create a [DigitalOcean](https://cloud.digitalocean.com) account, attach a payment method.
- Create a [personal access token](https://cloud.digitalocean.com/account/api/tokens) with read + write.

### 2. Connect DigitalOcean to GitHub

In the DO dashboard → Apps → Create App → "GitHub" → authorize the `yieldfy` GitHub org for **both** `yieldfy/Yieldfy` and `yieldfy/yieldfy-api`. This is one-time OAuth; without it, DO cannot clone the private backend repo.

### 3. DNS at yieldfy.ai

| Hostname | Record | Target |
| --- | --- | --- |
| `yieldfy.ai`, `www.yieldfy.ai` | (Vercel) | Vercel's A / CNAME (already set) |
| `optimizer.yieldfy.ai` | `CNAME` | `<app-id>.ondigitalocean.app` — printed by `doctl apps create` |

DO issues a Let's Encrypt cert automatically once DNS resolves.

### 4. First deploy

The live App Platform spec ships inside the private repo at `yieldfy/yieldfy-api:.do/app.yaml`. Apply it:

```sh
brew install doctl
doctl auth init   # paste your DO access token

# Clone locally (or reference a local checkout)
git clone https://github.com/yieldfy/yieldfy-api
cd yieldfy-api

doctl apps create --spec .do/app.yaml
doctl apps list   # capture the app id
```

### 5. Set the attestor secret in DO

App Platform → yieldfy-optimizer → Settings → App-Level Env Vars → `YIELDFY_ATTESTOR_KEY`:

Paste the contents of `yieldfy/Yieldfy:ops/artifacts/devnet/attestor.json` — the 64-byte JSON array. Save. App redeploys automatically.

Verify:

```sh
curl https://optimizer.yieldfy.ai/attestor/pubkey
# → {"pubkey":"76XD6xfJhXoH7HhyywhTvkX5RT1etAoot3HN4AF1wHXb"}
```

That pubkey must equal `Config.attestor` on-chain, or deposits will revert.

### 6. Point the dashboard at production

In Vercel → Project (yieldfy) → Settings → Environment Variables → Production, paste everything from `apps/dashboard/.env.production.example`. Redeploy.

---

## Continuous deploy

Once set up, pushing to `main` on `yieldfy/yieldfy-api` triggers a zero-downtime redeploy automatically (`deploy_on_push: true` in the spec). Pushing a tag is optional — the branch push is authoritative.

No GitHub Actions workflow on `yieldfy/Yieldfy` drives the deploy; the private repo owns its own release cadence.

---

## Rotating the attestor key

1. Generate a new keypair (`solana-keygen new -o new-attestor.json`).
2. Call `rotate_attestor(new_pubkey)` on-chain as the Config authority.
3. In DO → yieldfy-optimizer → App-Level Env Vars, replace `YIELDFY_ATTESTOR_KEY` with the new JSON byte array. Save.
4. `curl https://optimizer.yieldfy.ai/attestor/pubkey` should return the new pubkey.
5. Keep the old key around for 24h — in-flight attestations still need to clear the staleness window.

---

## Pre-launch checklist

- [ ] DO GitHub integration authorized for `yieldfy/yieldfy-api` (private).
- [ ] `optimizer.yieldfy.ai` CNAME resolves.
- [ ] `curl https://optimizer.yieldfy.ai/health` → `{ok:true}`.
- [ ] `/attestor/pubkey` matches `Config.attestor` on-chain.
- [ ] `CORS_ORIGIN=https://yieldfy.ai` on the app.
- [ ] Vercel env has `VITE_OPTIMIZER_URL=https://optimizer.yieldfy.ai` and the live devnet addresses.
- [ ] Dashboard deposit from a fresh Phantom wallet lands on devnet.

---

## Rollback

```sh
doctl apps list-deployments <APP-ID>
doctl apps create-deployment <APP-ID> --rollback <DEPLOYMENT-ID>
```

Solana program state is unaffected by any App Platform change.
