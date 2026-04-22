import { z } from "zod";

const schema = z.object({
  VITE_SOLANA_RPC_URL: z
    .string()
    .url()
    .optional()
    .default("https://api.mainnet-beta.solana.com"),
  VITE_WXRP_MINT: z.string().optional(),
  VITE_YXRP_MINT: z.string().optional(),
  VITE_YIELDFY_PROGRAM_ID: z.string().optional(),
  VITE_OPTIMIZER_URL: z.string().url().optional().default("http://localhost:4000"),
});

export type Env = z.infer<typeof schema>;

function validate(): Env {
  const parsed = schema.safeParse({
    VITE_SOLANA_RPC_URL: import.meta.env.VITE_SOLANA_RPC_URL,
    VITE_WXRP_MINT: import.meta.env.VITE_WXRP_MINT,
    VITE_YXRP_MINT: import.meta.env.VITE_YXRP_MINT,
    VITE_YIELDFY_PROGRAM_ID: import.meta.env.VITE_YIELDFY_PROGRAM_ID,
    VITE_OPTIMIZER_URL: import.meta.env.VITE_OPTIMIZER_URL,
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
