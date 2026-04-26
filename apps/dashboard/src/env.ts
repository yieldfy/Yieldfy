import { z } from "zod";

const schema = z.object({
  VITE_SOLANA_RPC_URL: z
    .string()
    .url()
    .optional()
    .default("https://api.mainnet-beta.solana.com"),
  VITE_SOLANA_RPC_URL_MAINNET: z.string().url().optional(),
  VITE_SOLANA_RPC_URL_DEVNET: z
    .string()
    .url()
    .optional()
    .default("https://api.devnet.solana.com"),
  VITE_WXRP_MINT: z.string().optional(),
  VITE_YXRP_MINT: z.string().optional(),
  VITE_YIELDFY_PROGRAM_ID: z.string().optional(),
  VITE_OPTIMIZER_URL: z.string().url().optional().default("http://localhost:4000"),
  VITE_REWARDS_INDEXER_URL: z.string().url().optional(),
  VITE_DISTRIBUTOR_PROGRAM_ID: z.string().optional(),
  VITE_DISTRIBUTOR_ID: z.coerce.bigint().optional().default(0n),
});

export type Env = z.infer<typeof schema>;

function validate(): Env {
  const parsed = schema.safeParse({
    VITE_SOLANA_RPC_URL: import.meta.env.VITE_SOLANA_RPC_URL,
    VITE_SOLANA_RPC_URL_MAINNET: import.meta.env.VITE_SOLANA_RPC_URL_MAINNET,
    VITE_SOLANA_RPC_URL_DEVNET: import.meta.env.VITE_SOLANA_RPC_URL_DEVNET,
    VITE_WXRP_MINT: import.meta.env.VITE_WXRP_MINT,
    VITE_YXRP_MINT: import.meta.env.VITE_YXRP_MINT,
    VITE_YIELDFY_PROGRAM_ID: import.meta.env.VITE_YIELDFY_PROGRAM_ID,
    VITE_OPTIMIZER_URL: import.meta.env.VITE_OPTIMIZER_URL,
    VITE_REWARDS_INDEXER_URL: import.meta.env.VITE_REWARDS_INDEXER_URL,
    VITE_DISTRIBUTOR_PROGRAM_ID: import.meta.env.VITE_DISTRIBUTOR_PROGRAM_ID,
    VITE_DISTRIBUTOR_ID: import.meta.env.VITE_DISTRIBUTOR_ID,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  · ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(
      `[env] invalid environment — falling back to defaults where possible:\n${issues}`,
    );
    return schema.parse({});
  }
  return parsed.data;
}

export const env = validate();

export const RPC_ENDPOINTS = {
  mainnet: env.VITE_SOLANA_RPC_URL_MAINNET ?? env.VITE_SOLANA_RPC_URL,
  devnet: env.VITE_SOLANA_RPC_URL_DEVNET,
} as const;
