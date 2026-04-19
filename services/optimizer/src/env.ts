import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  SOLANA_RPC_URL: z.string().url().default("https://api.devnet.solana.com"),
  YIELDFY_ATTESTOR_KEY: z.string().optional(),
  REDIS_URL: z
    .string()
    .regex(/^rediss?:\/\//, "REDIS_URL must start with redis:// or rediss://")
    .optional(),
  AXIOM_TOKEN: z.string().optional(),
  AXIOM_DATASET: z.string().optional(),
  AXIOM_ORG_ID: z.string().optional(),
  ATTEST_RATE_MAX: z.coerce.number().int().positive().default(60),
  ATTEST_RATE_WINDOW: z.string().default("1 minute"),
});

export type Env = z.infer<typeof schema>;

function validate(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  · ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    // eslint-disable-next-line no-console
    console.error(`[env] invalid environment:\n${issues}`);
    process.exit(1);
  }
  if (parsed.data.AXIOM_TOKEN && !parsed.data.AXIOM_DATASET) {
    // eslint-disable-next-line no-console
    console.warn(
      "[env] AXIOM_TOKEN is set but AXIOM_DATASET isn't — Axiom ingest stays off.",
    );
  }
  return parsed.data;
}

export const env = validate();
