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
