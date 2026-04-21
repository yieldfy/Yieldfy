const PORT = Number.parseInt(process.env.PORT ?? "4100", 10);
const POLL_MS = Number.parseInt(process.env.INDEXER_POLL_MS ?? "15000", 10);

if (!Number.isFinite(PORT) || PORT <= 0) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}
if (!Number.isFinite(POLL_MS) || POLL_MS < 1000) {
  throw new Error(
    `INDEXER_POLL_MS must be >= 1000ms (got ${process.env.INDEXER_POLL_MS})`,
  );
}
if (!process.env.SOLANA_RPC_URL) {
  throw new Error("SOLANA_RPC_URL is required");
}
if (!process.env.WXRP_MINT) {
  throw new Error("WXRP_MINT is required (base58 mint address)");
}

export const env = {
  PORT,
  POLL_MS,
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
  WXRP_MINT: process.env.WXRP_MINT,
} as const;
