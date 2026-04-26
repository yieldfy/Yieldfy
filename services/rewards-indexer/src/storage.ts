/**
 * Filesystem-backed epoch persistence. JSON-per-epoch, plus a `latest.json`
 * pointer for fast "what's claimable now?" queries. Postgres can replace
 * this without touching callers — they only see the EpochResult shape.
 */

import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ParticipantScore } from "@yieldfy/sdk";

export interface EpochResult {
  epochId: number;
  startedAt: number;
  endedAt: number;
  snapshotSlot: number | null;
  marketCapUsd: number;
  solPriceUsd: number;
  poolUsd: number;
  poolSol: number;
  poolLamports: string; // bigint serialized
  merkleRoot: string;
  participants: number;
  scores: ParticipantScore[];
  /** Per-wallet claim with proof. Indexed by wallet. */
  claims: Record<
    string,
    {
      index: number;
      lamports: string;
      proof: string[];
    }
  >;
  /** Sum of all claim.lamports as bigint string. Used to fund the Saber distributor. "0" for empty-pool epochs. */
  totalLamports: string;
  /** Saber distributor PDA base58, populated by the publisher after the Squads tx confirms. Null while pending or for empty-pool epochs. */
  saberDistributor: string | null;
  /** Base keypair pubkey used to derive the Saber distributor PDA. Same null semantics as saberDistributor. */
  saberDistributorBase: string | null;
  /** Wall-clock ms when the publisher confirmed the Squads tx. Null until then. */
  saberPublishedAt: number | null;
}

export class EpochStorage {
  constructor(private readonly dir: string) {}

  private path(epochId: number): string {
    return join(this.dir, `epoch-${String(epochId).padStart(6, "0")}.json`);
  }

  async ensureDir(): Promise<void> {
    if (!existsSync(this.dir)) await mkdir(this.dir, { recursive: true });
  }

  async write(result: EpochResult): Promise<void> {
    await this.ensureDir();
    const json = JSON.stringify(result, null, 2);
    await writeFile(this.path(result.epochId), json, "utf-8");
    await writeFile(join(this.dir, "latest.json"), json, "utf-8");
  }

  async read(epochId: number): Promise<EpochResult | null> {
    try {
      const txt = await readFile(this.path(epochId), "utf-8");
      return JSON.parse(txt) as EpochResult;
    } catch {
      return null;
    }
  }

  async readLatest(): Promise<EpochResult | null> {
    try {
      const txt = await readFile(join(this.dir, "latest.json"), "utf-8");
      return JSON.parse(txt) as EpochResult;
    } catch {
      return null;
    }
  }

  async listEpochIds(): Promise<number[]> {
    if (!existsSync(this.dir)) return [];
    const files = await readdir(this.dir);
    return files
      .map((f) => f.match(/^epoch-(\d+)\.json$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b);
  }
}
