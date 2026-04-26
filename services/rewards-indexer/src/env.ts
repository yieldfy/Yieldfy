import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4100),
  HOST: z.string().default("0.0.0.0"),
  SOLANA_RPC_URL: z.string().url().default("https://api.mainnet-beta.solana.com"),

  /** $YIELDFY mint. Optional pre-launch — endpoints return empty until set. */
  YIELDFY_MINT: z.string().optional(),
  /** Total $YIELDFY supply (for MC = price × supply). */
  YIELDFY_SUPPLY: z.coerce.number().positive().default(1_000_000_000),

  /** wXRP mint (for vault USD valuation via Jupiter price). */
  WXRP_MINT: z.string().default("6UpQcMAb5xMzxc7ZfPaVMgx3KqsvKZdT5U718BzD5We2"),

  /** Yieldfy program ID. Position PDAs live under this. */
  YIELDFY_PROGRAM_ID: z.string().default("3PY2nY7UVQR327WeSdJFrsrcrqhD4wE2CHg4ZcDarGDE"),

  /** Path where epoch JSON snapshots are written. */
  STORAGE_DIR: z.string().default("./data/epochs"),

  /** Epoch length in hours. Default 168h = 1 week. */
  EPOCH_HOURS: z.coerce.number().positive().default(168),

  /** How many MC samples to average for the rolling mean. */
  MC_SAMPLE_COUNT: z.coerce.number().int().positive().default(7),

  /** Override params via env (otherwise SDK defaults). */
  ALPHA: z.coerce.number().positive().optional(),
  BETA: z.coerce.number().positive().optional(),
  DISTRIBUTION_RATE: z.coerce.number().positive().optional(),

  /**
   * Squads V4 multisig PDA. Required to publish epochs on-chain via the Saber
   * distributor — without it, /admin/publish-epoch returns a 503 and the
   * indexer is read-only. Pre-launch (empty pools) the indexer doesn't need
   * this; set it before the $YIELDFY token mints.
   */
  SQUADS_MULTISIG_PDA: z.string().optional(),
  /** Vault index inside the multisig (Squads' "authority index"). Default 0. */
  SQUADS_VAULT_INDEX: z.coerce.number().int().nonnegative().default(0),
  /**
   * Proposer keypair — needs at least Initiate permission on the multisig.
   * Either provide a path to a JSON keypair file, OR the inline JSON content
   * (a 64-element byte array). The proposer never holds vote/execute power in
   * the recommended setup; member 1 + member 2 approve via Squads UI.
   */
  SQUADS_PROPOSER_KEYPAIR_PATH: z.string().optional(),
  SQUADS_PROPOSER_KEYPAIR_JSON: z.string().optional(),
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
  return parsed.data;
}

export const env = validate();
