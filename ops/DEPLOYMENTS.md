# Live deployments

Canonical record of every Yieldfy program deployment. Append-only — do not edit past entries.

## devnet

| Field | Value |
| --- | --- |
| Program ID | [`3PY2nY7UVQR327WeSdJFrsrcrqhD4wE2CHg4ZcDarGDE`](https://explorer.solana.com/address/3PY2nY7UVQR327WeSdJFrsrcrqhD4wE2CHg4ZcDarGDE?cluster=devnet) |
| ProgramData | `6bTJy9V486umZCW4MsJBkjQXC7E9WqX2BcMKnwwPduRU` |
| Upgrade authority | `4e4Xf6ZtLuPqV8z5Ewp7e6GUCqbgUq3YVwigGPJYNyTM` (single-sig, devnet only) |
| IDL account | `CVmub7Lf8afXVSKSqcLVDV7NJ66cVeeSfmnFCDXHVEAT` |
| First deploy tx | [`5UC7G6jYfnfrdZvpLphKyQiAN4nDCAMKhA71tr9PNXZg5r7RFbKGKKYk9xcGarsUk25oyNKDz7aHw44t6XX15Yhy`](https://explorer.solana.com/tx/5UC7G6jYfnfrdZvpLphKyQiAN4nDCAMKhA71tr9PNXZg5r7RFbKGKKYk9xcGarsUk25oyNKDz7aHw44t6XX15Yhy?cluster=devnet) |
| First deploy slot | `457092476` |
| First deploy date | 2026-04-21 |
| Code version | `v1.9.0` |
| Program size | 358,616 bytes |
| Rent | 2.49717144 SOL |

### Post-deploy checklist

- [x] Program account visible on Solana Explorer.
- [x] IDL account written (`anchor idl` accessible by clients).
- [x] `initialize()` called with devnet attestor pubkey → Config PDA created.
- [x] wXRP mint set in `apps/dashboard/.env.example` (`VITE_WXRP_MINT`).
- [x] yXRP mint created + mint authority handed to the Config PDA.
- [ ] Optimizer `YIELDFY_ATTESTOR_KEY` published and `/attestor/pubkey` matches `Config.attestor`.
- [ ] First end-to-end `deposit` transaction recorded from the dashboard.

### Initialized state

| Account | Address |
| --- | --- |
| Config PDA | [`AhSmxEXYsAhkH1hZgJwvcJyAAXSi8giPs7fgZJhR7pvu`](https://explorer.solana.com/address/AhSmxEXYsAhkH1hZgJwvcJyAAXSi8giPs7fgZJhR7pvu?cluster=devnet) |
| Vault PDA (wXRP) | [`CMaW1VAWTPpP18VXfrs33f6UTUFhAoqLNxKx1C8yaAoa`](https://explorer.solana.com/address/CMaW1VAWTPpP18VXfrs33f6UTUFhAoqLNxKx1C8yaAoa?cluster=devnet) |
| wXRP test mint | [`7CRLtijwzVMRH2JKMD49VDFkNrHxz26mNcP1Muybdak1`](https://explorer.solana.com/address/7CRLtijwzVMRH2JKMD49VDFkNrHxz26mNcP1Muybdak1?cluster=devnet) |
| yXRP mint | [`8N7kff8LS3R6GgMhGBMVhNNRA15xRsXGU7YvPCcnSxe`](https://explorer.solana.com/address/8N7kff8LS3R6GgMhGBMVhNNRA15xRsXGU7YvPCcnSxe?cluster=devnet) |
| Attestor pubkey | `76XD6xfJhXoH7HhyywhTvkX5RT1etAoot3HN4AF1wHXb` |
| Initialize tx | [`5jcsaFhMj4fwPJuFp8wA1kzSuxw2AsHp1jDStDCXAMcBaLDAWq3o9rSYyiVeS6zQ8ukDWHqeGMz3s3UJtCFgZP7Z`](https://explorer.solana.com/tx/5jcsaFhMj4fwPJuFp8wA1kzSuxw2AsHp1jDStDCXAMcBaLDAWq3o9rSYyiVeS6zQ8ukDWHqeGMz3s3UJtCFgZP7Z?cluster=devnet) |
| yXRP SetAuthority tx | [`1g8nt3P5nuBV3pQD57AMeCnprMxbSh3FerySET2ywwCYjWmH3UKkA3tkvTwkhzcWoB3dd3ZYVpdCrWSeD437kCG`](https://explorer.solana.com/tx/1g8nt3P5nuBV3pQD57AMeCnprMxbSh3FerySET2ywwCYjWmH3UKkA3tkvTwkhzcWoB3dd3ZYVpdCrWSeD437kCG?cluster=devnet) |
| Config `max_single_deposit` | `1_000_000_000` (base units, 1000 wXRP at 6 decimals) |
| Config `staleness_slots` | `150` |

Attestor secret key + mint secret keys live under `ops/artifacts/devnet/` (git-ignored). Do not commit.

## mainnet-beta

Pending. Requires audit remediation + multisig handoff — see [`DEPLOY.md`](./DEPLOY.md) for the runbook.
