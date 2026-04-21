# Local development against devnet

This walkthrough has the dashboard, optimizer, and on-chain program talking end-to-end from a single clone.

## Prereqs

- `node@20+`
- `rust@1.89`, `anchor-cli@0.32.1`, `solana-cli@1.18+` (only needed if you want to rebuild or redeploy the program; the live devnet program works without these)
- A Solana keypair with some devnet SOL at `~/.config/solana/dinosecurities-deployer.json` (swap the path in `ops/scripts/init-devnet.ts` if yours lives elsewhere)

## First-time setup

```sh
# 1. Install every workspace in one shot
npm install

# 2. Bootstrap the devnet state the first time — creates the wXRP + yXRP
#    test mints, the attestor keypair, calls initialize(), and hands the
#    yXRP mint authority to the Config PDA. Safe to re-run.
npm --prefix ops/scripts run init:devnet

# 3. Drop the printed VITE_* lines into apps/dashboard/.env. The defaults
#    in apps/dashboard/.env.example are already set to the live devnet
#    deploy, so `cp apps/dashboard/.env.example apps/dashboard/.env` is
#    enough if you'll use the shared program.
cp apps/dashboard/.env.example apps/dashboard/.env
```

## Running

```sh
./ops/dev.sh
```

This starts:

- `services/optimizer` on <http://localhost:4000> (loads the devnet attestor from `ops/artifacts/devnet/attestor.json`)
- `apps/dashboard` on <http://localhost:8080> (Vite dev server)

Open the dashboard, connect Phantom or Backpack set to **devnet**, fund the user ATA with test wXRP (step below), and try a deposit from the UI.

## Seeding your wallet with test wXRP

The `wXRP` mint on devnet is a test mint we created — payer (deployer) holds the authority. To fund an arbitrary user:

```sh
# 10 wXRP to any devnet pubkey
npm --prefix ops/scripts run deposit:devnet
# -> uses the deployer as user. Wire your own keypair in if needed.
```

## Useful checks

```sh
# Optimizer signs the same key that's stored on-chain
curl http://localhost:4000/attestor/pubkey
# → {"pubkey":"76XD6xfJhXoH7HhyywhTvkX5RT1etAoot3HN4AF1wHXb"}

# Fresh signed attestation for the UI
curl 'http://localhost:4000/attest?profile=balanced' | jq

# Fetch the Config PDA directly from chain
solana account AhSmxEXYsAhkH1hZgJwvcJyAAXSi8giPs7fgZJhR7pvu -u devnet

# Anchor IDL lives on-chain — any anchor-capable client can fetch it
solana account CVmub7Lf8afXVSKSqcLVDV7NJ66cVeeSfmnFCDXHVEAT -u devnet
```

## Redeploying (only if you're changing the program)

```sh
./ops/deploy.sh devnet
# then re-sync the IDL into the SDK
cp target/idl/yieldfy.json packages/sdk/src/idl/yieldfy.json
npm -w @yieldfy/sdk run build
```

## Ports in use

| Port | Service | Source |
| --- | --- | --- |
| 4000 | optimizer | `services/optimizer` |
| 4100 | wxrp-indexer | `services/wxrp-indexer` (not started by `dev.sh`; run separately if needed) |
| 8080 | dashboard | `apps/dashboard` |
| 9090 | prometheus (optional) | `docker compose up prometheus` |
| 3030 | grafana (optional) | `docker compose up grafana` |

## Troubleshooting

- **Optimizer boots but `/attestor/pubkey` returns a different key** — `YIELDFY_ATTESTOR_KEY` isn't loaded. `dev.sh` loads it from `ops/artifacts/devnet/attestor.json`; check the file exists.
- **Dashboard deposit fails with `BadAttestor`** — confirm the same thing: the optimizer's pubkey must equal `Config.attestor` on-chain.
- **Dashboard deposit fails with `CapExceeded`** — `Config.max_single_deposit` is `1_000_000_000` base units (1000 wXRP at 6 decimals). Admin can raise it with `set_cap`.
- **`@rolldown/binding-linux-x64-gnu` crash in CI** — the SDK must stay on `vitest@^3.2.4`. See [reference_repos.md note] or `SECURITY.md`.
- **`fastify-plugin: expected 5.x` crash** — `@fastify/rate-limit` must stay on `^9.1.0` while the optimizer is on fastify 4.
