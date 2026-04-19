# @yieldfy/optimizer

Off-chain scoring + attestation service. Called by the SDK before every deposit and rebalance to produce a signed (venue, slot) tuple the Anchor program verifies via its ed25519 precompile check.

## Scripts

```bash
npm install
npm run dev    # tsx watch — hot reloads on change
npm run build  # emits dist/
npm start      # node dist/server.js
npm test       # vitest run
```

## Endpoints

| Path                | Method | Description                                    |
| ------------------- | ------ | ---------------------------------------------- |
| `/health`           | GET    | Liveness check.                                |
| `/attestor/pubkey`  | GET    | Ed25519 public key used to sign attestations. Whitelist this in the Anchor `Config.attestor` field. |
| `/venues`           | GET    | Current DeFiLlama snapshots for all venues.    |
| `/choose`           | GET    | `?profile=conservative\|balanced\|opportunistic` — returns the top-scoring venue (unsigned). |
| `/attest`           | GET    | `?profile=…` — selects the top venue, fetches the current Solana slot, and returns a signed attestation the SDK passes to `deposit_wxrp_to_kamino` via an ed25519 pre-instruction. |

## Environment

| Var                    | Default                              | Purpose                                                    |
| ---------------------- | ------------------------------------ | ---------------------------------------------------------- |
| `PORT`                 | `4000`                               | HTTP listen port.                                          |
| `HOST`                 | `0.0.0.0`                            | HTTP listen host.                                          |
| `SOLANA_RPC_URL`       | `https://api.devnet.solana.com`      | RPC used to read the current slot for attestation freshness. |
| `YIELDFY_ATTESTOR_KEY` | *(ephemeral)*                        | JSON array of 64 bytes (solana-keygen output). When unset, the server generates a fresh keypair on boot and logs its pubkey — convenient for dev, fatal for prod. |

### Generating a persistent attestor key

```bash
solana-keygen new --no-bip39-passphrase -o attestor.json
export YIELDFY_ATTESTOR_KEY="$(cat attestor.json)"
```

Then whitelist the printed `/attestor/pubkey` in the Anchor `Config.attestor` field.

## Scoring weights (§09)

| Profile          | apy  | tvl  | util | oracle | audit |
| ---------------- | ---- | ---- | ---- | ------ | ----- |
| conservative     | 0.35 | 0.25 | 0.15 | 0.10   | 0.15  |
| balanced         | 0.50 | 0.20 | 0.10 | 0.10   | 0.10  |
| opportunistic    | 0.70 | 0.10 | 0.05 | 0.05   | 0.10  |
