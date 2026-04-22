# Yieldfy frontend template

A minimal React example of depositing wXRP through the Yieldfy router. Drop [`DepositFlow.tsx`](./DepositFlow.tsx) into any Vite + React app that has `@solana/wallet-adapter-react` wired up, and adapt from there.

## Prerequisites

- Node 20+
- A Solana wallet adapter (`@solana/wallet-adapter-react` + any wallet like Phantom) already mounted in your app tree.
- Devnet config:
  - Program ID: `3PY2nY7UVQR327WeSdJFrsrcrqhD4wE2CHg4ZcDarGDE`
  - Optimizer: `https://optimizer.yieldfy.ai`
  - wXRP mint (devnet test): `7CRLtijwzVMRH2JKMD49VDFkNrHxz26mNcP1Muybdak1`

## Install

```sh
npm install @yieldfy/sdk @coral-xyz/anchor @solana/web3.js @solana/spl-token \
  @solana/wallet-adapter-react
```

## Use

Copy [`DepositFlow.tsx`](./DepositFlow.tsx) into your `src/` and mount it somewhere inside a `ConnectionProvider` + `WalletProvider`:

```tsx
import { DepositFlow } from "./DepositFlow";

export function App() {
  return (
    <DepositFlow
      programId="3PY2nY7UVQR327WeSdJFrsrcrqhD4wE2CHg4ZcDarGDE"
      optimizerUrl="https://optimizer.yieldfy.ai"
    />
  );
}
```

The component:

1. Reads the user's wXRP balance.
2. Fetches a signed attestation from the optimizer.
3. Calls `Yieldfy.deposit()` — the Anchor program verifies the ed25519 attestation on-chain and mints yXRP 1:1.

## Where to go next

- Mainnet program ID, mints, and optimizer URL will be published under [Releases](https://github.com/yieldfy/Yieldfy/releases) once the audit + multisig handoff lands.
- For the full integration narrative (webhooks, risk profiles, optimizer surface) see [`docs/integration.md`](../docs/integration.md).
