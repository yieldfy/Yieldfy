# Integration guide

This page explains how a tenant consumes Yieldfy — SDK, optimizer, webhooks — end to end. Some sections reference code that lands at Phase 5 (⏳ waiting for the on-chain deploy); those are flagged inline.

## Architecture at a glance

```
┌──────────────┐        ┌─────────────────┐       ┌──────────────────┐
│  Tenant app  │        │  @yieldfy/sdk   │       │ Yieldfy program  │
│   (React /   │ ──▶    │  typed client   │ ──▶   │    (Anchor,      │
│    server)   │        │ (browser + node)│       │  programs/yieldfy│
└──────────────┘        └─────────────────┘       └──────────────────┘
       │                         │                          ▲
       │ HTTPS                   │ HTTPS                    │
       ▼                         ▼                          │ ed25519
┌─────────────────────────────────────────────────┐   pre-ix│
│            Yieldfy Optimizer                    │─────────┘
│  /attest · /choose · /venues · /metrics         │
│         /webhooks · /attestor/pubkey            │
└─────────────────────────────────────────────────┘
       │
       │ HMAC-signed POST
       ▼
┌──────────────┐
│ Tenant hook  │
└──────────────┘
```

## 1 · Get a signed attestation

Before every deposit or rebalance, fetch a fresh attestation from the optimizer:

```ts
import { fetchAttestation } from "@yieldfy/sdk";

const attestation = await fetchAttestation(
  process.env.OPTIMIZER_URL!, // e.g. https://optimizer.yieldfy.ai
  "balanced",                 // "conservative" | "balanced" | "opportunistic"
);
```

The optimizer returns `{ venue, venueCode, slot, sigHex, pubkeyBase58 }` — the exact shape the Anchor program's ed25519 pre-instruction check expects (see §07 of the engineering plan).

## 2 · Submit a deposit ⏳ *Phase 5*

```ts
// Lands once the IDL is published.
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Yieldfy } from "@yieldfy/sdk";

const client = new Yieldfy(provider, new PublicKey(PROGRAM_ID));
const signature = await client.deposit({ amount: 1_000_000n }, attestation);
```

Under the hood the SDK will:
1. Build an ed25519 pre-instruction from `attestation.sigHex` / `attestation.pubkeyBase58` / the venue-slot message.
2. Derive the user's Position PDA + vault wXRP ATA.
3. Call `deposit_wxrp_to_kamino` with the attestation as `DepositArgs`.
4. Return the tx signature.

## 3 · Subscribe to webhooks

Register a webhook endpoint to get notified when attestations fire:

```bash
curl -X POST https://optimizer.yieldfy.ai/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://tenant.example.com/hooks/yieldfy",
    "events": ["attestation.created"]
  }'
```

Response:
```json
{
  "id": "c937c11b-14cd-48c1-b51e-3db161d8d22e",
  "url": "https://tenant.example.com/hooks/yieldfy",
  "events": ["attestation.created"],
  "secret": "27f3d3e993eed17319d061efc2c86e1a259ce83662bd067efbb352a074670335",
  "createdAt": "2026-04-19T12:59:19.724Z"
}
```

**Store the secret.** It's used to verify inbound POSTs — see [webhooks.md](./webhooks.md).

## 4 · Read positions ⏳ *Phase 5*

```ts
// Lands once the IDL is published.
const position = await client.readPosition(userPubkey);
console.log(position.venue, position.principal, position.receiptSupply);
```

## Environment

| Var                     | Scope     | Notes                                                                 |
| ----------------------- | --------- | --------------------------------------------------------------------- |
| `VITE_OPTIMIZER_URL`    | dashboard | Usually `http://localhost:4000` in dev, your prod URL in prod.        |
| `VITE_YIELDFY_PROGRAM_ID` | dashboard | Capture from `anchor deploy` output (⏳ waiting for on-chain deploy).         |
| `SOLANA_RPC_URL`        | optimizer | Used for `Connection.getSlot()` when attesting.                       |
| `YIELDFY_ATTESTOR_KEY`  | optimizer | Persistent ed25519 key (JSON byte array). Whitelist its pubkey in the Anchor `Config.attestor`. |
| `AXIOM_TOKEN`           | optimizer | Optional. Enables structured event ingestion to Axiom.                |
| `AXIOM_DATASET`         | optimizer | Paired with `AXIOM_TOKEN`.                                            |

## Error model

- `400` — client error (bad profile, malformed webhook body).
- `500` — upstream failure (DeFiLlama down, Solana RPC error).
- Responses always include `x-correlation-id` — echo it in support tickets so we can join traces across optimizer logs, Grafana, and Axiom.
