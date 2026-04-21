import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";

export type SupplySnapshot = {
  slot: number;
  supplyRaw: bigint;
  decimals: number;
  ts: number;
};

export async function readSupply(
  connection: Connection,
  mint: PublicKey,
): Promise<SupplySnapshot> {
  const [mintInfo, slot] = await Promise.all([
    getMint(connection, mint),
    connection.getSlot(),
  ]);
  return {
    slot,
    supplyRaw: mintInfo.supply,
    decimals: mintInfo.decimals,
    ts: Date.now(),
  };
}

export type SupplyDelta = {
  prev: SupplySnapshot;
  next: SupplySnapshot;
  diffRaw: bigint; // positive = mint, negative = burn
};

export function diff(prev: SupplySnapshot, next: SupplySnapshot): SupplyDelta {
  return {
    prev,
    next,
    diffRaw: next.supplyRaw - prev.supplyRaw,
  };
}
