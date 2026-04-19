import type Redis from "ioredis";
import type { Subscription, WebhookEvent } from "./webhooks.js";

export interface SubscriptionStore {
  list(): Promise<Subscription[]>;
  get(id: string): Promise<Subscription | null>;
  save(sub: Subscription): Promise<void>;
  delete(id: string): Promise<boolean>;
  /** Optional hook for graceful shutdown of long-lived connections. */
  close?(): Promise<void>;
}

// -- memory -----------------------------------------------------------------

export class MemorySubscriptionStore implements SubscriptionStore {
  private subs = new Map<string, Subscription>();
  async list() { return Array.from(this.subs.values()); }
  async get(id: string) { return this.subs.get(id) ?? null; }
  async save(sub: Subscription) { this.subs.set(sub.id, sub); }
  async delete(id: string) { return this.subs.delete(id); }
}

// -- redis ------------------------------------------------------------------

const KEY_SET = "yieldfy:webhooks:ids";
const KEY_HASH = (id: string) => `yieldfy:webhooks:${id}`;

export class RedisSubscriptionStore implements SubscriptionStore {
  constructor(private client: Redis) {}

  async list(): Promise<Subscription[]> {
    const ids = await this.client.smembers(KEY_SET);
    if (ids.length === 0) return [];
    const subs = await Promise.all(ids.map((id) => this.get(id)));
    return subs.filter((s): s is Subscription => s !== null);
  }

  async get(id: string): Promise<Subscription | null> {
    const raw = await this.client.get(KEY_HASH(id));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Subscription;
      return parsed;
    } catch {
      return null;
    }
  }

  async save(sub: Subscription) {
    await Promise.all([
      this.client.set(KEY_HASH(sub.id), JSON.stringify(sub)),
      this.client.sadd(KEY_SET, sub.id),
    ]);
  }

  async delete(id: string): Promise<boolean> {
    const [removed, delCount] = await Promise.all([
      this.client.srem(KEY_SET, id),
      this.client.del(KEY_HASH(id)),
    ]);
    return removed > 0 || delCount > 0;
  }

  async close() {
    await this.client.quit();
  }
}
