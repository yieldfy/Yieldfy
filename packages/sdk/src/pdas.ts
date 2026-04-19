import { PublicKey } from "@solana/web3.js";

export const CONFIG_SEED = Buffer.from("config");
export const POSITION_SEED = Buffer.from("position");
export const VAULT_SEED = Buffer.from("vault");

export const IX_SYSVAR = new PublicKey(
  "Sysvar1nstructions1111111111111111111111111",
);

export const KAMINO_PROGRAM_ID = new PublicKey(
  "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
);

export function findConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], programId);
}

export function findPositionPda(
  user: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POSITION_SEED, user.toBuffer()],
    programId,
  );
}

export function findVaultPda(
  mint: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, mint.toBuffer()],
    programId,
  );
}
