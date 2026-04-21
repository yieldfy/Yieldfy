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
- [ ] `initialize()` called with devnet attestor pubkey → Config PDA created.
- [ ] wXRP mint set in `apps/dashboard/.env` (`VITE_WXRP_MINT`).
- [ ] yXRP mint created + mint authority handed to the Config PDA.
- [ ] Optimizer `YIELDFY_ATTESTOR_KEY` published and `/attestor/pubkey` matches `Config.attestor`.
- [ ] First end-to-end `deposit` transaction recorded from the dashboard.

## mainnet-beta

Pending. Requires audit remediation + multisig handoff — see [`DEPLOY.md`](./DEPLOY.md) for the runbook.
