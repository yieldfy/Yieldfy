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
- [x] Optimizer `YIELDFY_ATTESTOR_KEY` loaded from `ops/artifacts/devnet/attestor.json`; `/attestor/pubkey` returns `76XD6xfJhXoH7HhyywhTvkX5RT1etAoot3HN4AF1wHXb` — matches `Config.attestor`.
- [x] First end-to-end `deposit` transaction recorded ([`4jCiLJTrVg8c…S2tU`](https://explorer.solana.com/tx/4jCiLJTrVg8ceG551NWfErpgXmbR4tpJHeimoyNXKkRv8wwpsn9KgCSc32BkAmwogx9TSZAaJZLXBEyEbL68S2tU?cluster=devnet), 2026-04-21).

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

### First deposit (2026-04-21)

| Field | Value |
| --- | --- |
| User | `4e4Xf6ZtLuPqV8z5Ewp7e6GUCqbgUq3YVwigGPJYNyTM` |
| Position PDA | [`BTcsQEra85QtDo4c2KWCwq1jewEHkySFTeNx3ZQriaa9`](https://explorer.solana.com/address/BTcsQEra85QtDo4c2KWCwq1jewEHkySFTeNx3ZQriaa9?cluster=devnet) |
| Amount | `10_000_000` base units (10 wXRP) |
| Venue | `0` (kamino) |
| Attestation slot | `457094693` |
| Deposit tx | [`4jCiLJTrVg8ceG551NWfErpgXmbR4tpJHeimoyNXKkRv8wwpsn9KgCSc32BkAmwogx9TSZAaJZLXBEyEbL68S2tU`](https://explorer.solana.com/tx/4jCiLJTrVg8ceG551NWfErpgXmbR4tpJHeimoyNXKkRv8wwpsn9KgCSc32BkAmwogx9TSZAaJZLXBEyEbL68S2tU?cluster=devnet) |
| Prep tx (mint + ATAs) | [`4Wu7oPuqLBPxcMrgpcZQGXedWj1xfyd3zF6azf7DTeSeidm3UveqHhQvkCXC6ykXQ35Tw2cgzhq5cddBhDGJpWmn`](https://explorer.solana.com/tx/4Wu7oPuqLBPxcMrgpcZQGXedWj1xfyd3zF6azf7DTeSeidm3UveqHhQvkCXC6ykXQ35Tw2cgzhq5cddBhDGJpWmn?cluster=devnet) |
| Principal | `10_000_000` |
| Receipt supply | `10_000_000` (yXRP minted 1:1) |

## mainnet-beta

| Field | Value |
| --- | --- |
| Program ID | [`3PY2nY7UVQR327WeSdJFrsrcrqhD4wE2CHg4ZcDarGDE`](https://explorer.solana.com/address/3PY2nY7UVQR327WeSdJFrsrcrqhD4wE2CHg4ZcDarGDE) |
| ProgramData | `6bTJy9V486umZCW4MsJBkjQXC7E9WqX2BcMKnwwPduRU` |
| Upgrade authority | [`48uosZFYVqLr5XEKsuohtrwfnsYkcqP9PVX838rGZXKD`](https://v4.squads.so/) (Squads 2-of-2 vault) |
| First deploy tx | [`5ch5QCpELPY7ymeqFsWsBoMNimum7i138Ss5pYsBNHjKroyXKyGKmVCwBNQ2LJuEi8dJ3QMG553hhCnaou1GbwUH`](https://explorer.solana.com/tx/5ch5QCpELPY7ymeqFsWsBoMNimum7i138Ss5pYsBNHjKroyXKyGKmVCwBNQ2LJuEi8dJ3QMG553hhCnaou1GbwUH) |
| First deploy slot | `415002209` |
| First deploy date | 2026-04-22 |
| Code version | `v1.20.0` + `rotate_authority` patch |
| Program size | 360,328 bytes |
| Deployer rent + fees spent | ~2.621 SOL |
| Launch posture | public beta (no external audit; caps per `DEPLOY.md` §Staged rollout) |

### Post-deploy checklist

- [x] Program account visible on Solana Explorer.
- [x] Upgrade authority transferred to Squads vault — verified via `solana program show`.
- [x] `initialize()` called with mainnet attestor pubkey, cap `100_000_000` (100 wXRP), staleness `150` slots.
- [x] `rotate_authority(squads_vault)` — `Config.authority` now = `48uos…ZXKD`.
- [x] yXRP mint authority handed to Config PDA — verified via `spl-token display`.

### Initialized state

| Account | Address |
| --- | --- |
| Config PDA | [`AhSmxEXYsAhkH1hZgJwvcJyAAXSi8giPs7fgZJhR7pvu`](https://explorer.solana.com/address/AhSmxEXYsAhkH1hZgJwvcJyAAXSi8giPs7fgZJhR7pvu) |
| Vault PDA (wXRP) | [`5CZnKQH1r42KuiHfW4DHDdf3x8o4KyG2oq9Eb6wbkgWR`](https://explorer.solana.com/address/5CZnKQH1r42KuiHfW4DHDdf3x8o4KyG2oq9Eb6wbkgWR) |
| wXRP mint (LayerZero-bridged) | [`6UpQcMAb5xMzxc7ZfPaVMgx3KqsvKZdT5U718BzD5We2`](https://explorer.solana.com/address/6UpQcMAb5xMzxc7ZfPaVMgx3KqsvKZdT5U718BzD5We2) |
| yXRP mint | [`4GPZvtLVqKryEuUQbk4Ap7JiHQ1u4RdLc9UfYweCbnp5`](https://explorer.solana.com/address/4GPZvtLVqKryEuUQbk4Ap7JiHQ1u4RdLc9UfYweCbnp5) |
| Attestor pubkey | `E86gTzWPwnFPtscwGn3NYQhkWt1S2RXN5Csj1mTBDMgo` |
| Initialize tx | [`3ALq5scAv6LhxdhyTQ1viRzTwPXcWeVG1TEfhrvMJaeGLXB5zZp7k9q36EdGTqCcDR4yzvZaHarj76EcEnTWCfd4`](https://explorer.solana.com/tx/3ALq5scAv6LhxdhyTQ1viRzTwPXcWeVG1TEfhrvMJaeGLXB5zZp7k9q36EdGTqCcDR4yzvZaHarj76EcEnTWCfd4) |
| rotate_authority tx | [`3Ynh8b13PwYBtNzyW6hkaTFJ5c5k8QTCAPkxSkfqdfVRuqb3ZyRrrGei69n3XY2E98xGA8Vu3BhLLjygvZn9E5dn`](https://explorer.solana.com/tx/3Ynh8b13PwYBtNzyW6hkaTFJ5c5k8QTCAPkxSkfqdfVRuqb3ZyRrrGei69n3XY2E98xGA8Vu3BhLLjygvZn9E5dn) |
| yXRP SetAuthority tx | [`95vyPS51SeUqFDSSTyjYZMxTxGxQ2AdT9D3gj9yoVjBpVtXPZAisZxzeetkyKaSiwxJ4iAx1KDRyLjZoayZKga1`](https://explorer.solana.com/tx/95vyPS51SeUqFDSSTyjYZMxTxGxQ2AdT9D3gj9yoVjBpVtXPZAisZxzeetkyKaSiwxJ4iAx1KDRyLjZoayZKga1) |
| Config `max_single_deposit` | `100_000_000` (100 wXRP at 6 decimals, Beta-0 cap) |
| Config `staleness_slots` | `150` |

Attestor secret key lives under `ops/artifacts/mainnet/` (git-ignored). Do not commit.
