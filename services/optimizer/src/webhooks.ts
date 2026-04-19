import {
  createHmac,
  randomUUID,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { webhookDispatchTotal } from "./metrics.js";
import {
  MemorySubscriptionStore,
  RedisSubscriptionStore,
  type SubscriptionStore,
} from "./subscription-store.js";

export type WebhookEvent = "attestation.created";

export type Subscription = {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  createdAt: string;
};

// --- store initialisation --------------------------------------------------

let store: SubscriptionStore = new MemorySubscriptionStore();

/** Wire a persistent store at boot. Safe to call only once. */
export async function initWebhookStore(redisUrl?: string) {
  if (!redisUrl) {
    store = new MemorySubscriptionStore();
    return { kind: "memory" as const };
  }
  const { default: Redis } = await import("ioredis");
  const client = new Redis(redisUrl, { lazyConnect: false, maxRetriesPerRequest: 3 });
  store = new RedisSubscriptionStore(client);
  return { kind: "redis" as const };
}

export async function shutdownWebhookStore() {
  await store.close?.();
}

// --- public API ------------------------------------------------------------

export async function listSubscriptions(): Promise<Subscription[]> {
  return store.list();
}

export async function createSubscription(
  url: string,
  events: WebhookEvent[],
  secret?: string,
): Promise<Subscription> {
  if (!/^https?:\/\//.test(url)) {
    throw new Error("Subscription url must be http(s)");
  }
  const sub: Subscription = {
    id: randomUUID(),
    url,
    events,
    secret: secret ?? randomBytes(32).toString("hex"),
    createdAt: new Date().toISOString(),
  };
  await store.save(sub);
  return sub;
}

export async function deleteSubscription(id: string): Promise<boolean> {
  return store.delete(id);
}

// --- signing ---------------------------------------------------------------

export function signBody(body: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

export function verifySignature(
  body: string,
  secret: string,
  header: string,
): boolean {
  const expected = signBody(body, secret);
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// --- dispatch + retry ------------------------------------------------------

type DispatchOptions = {
  timeoutMs?: number;
  corrId?: string;
  /** Max delivery attempts per subscription. Defaults to 3. */
  maxAttempts?: number;
  /** Backoff in ms between attempts. Defaults to [1_000, 5_000, 30_000]. */
  backoffMs?: number[];
};

const DEFAULT_BACKOFF_MS = [1_000, 5_000, 30_000];

async function postOnce(
  sub: Subscription,
  body: string,
  event: WebhookEvent,
  corrId: string,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(sub.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Yieldfy-Event": event,
        "X-Yieldfy-Delivery": randomUUID(),
        "X-Yieldfy-Signature": signBody(body, sub.secret),
        "X-Yieldfy-Correlation-Id": corrId,
      },
      body,
      signal: controller.signal,
    });
    return { status: res.status, ok: res.ok };
  } finally {
    clearTimeout(to);
  }
}

async function deliverWithRetry(
  sub: Subscription,
  body: string,
  event: WebhookEvent,
  corrId: string,
  opts: Required<Pick<DispatchOptions, "timeoutMs" | "maxAttempts" | "backoffMs">>,
) {
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      const { status, ok } = await postOnce(sub, body, event, corrId, opts.timeoutMs);
      const klass = `${Math.floor(status / 100)}xx`;
      webhookDispatchTotal.inc({ status: klass, event });
      if (ok) return;
      // 4xx = client error, don't retry; 5xx = retryable
      if (status < 500) return;
    } catch {
      webhookDispatchTotal.inc({ status: "err", event });
    }

    const isLast = attempt === opts.maxAttempts - 1;
    if (isLast) {
      // eslint-disable-next-line no-console
      console.warn(
        `[webhooks] dispatch to ${sub.url} failed after ${opts.maxAttempts} attempts (corrId=${corrId})`,
      );
      webhookDispatchTotal.inc({ status: "dead", event });
      return;
    }

    const delay = opts.backoffMs[Math.min(attempt, opts.backoffMs.length - 1)];
    await new Promise((r) => setTimeout(r, delay));
  }
}

/**
 * Fire-and-forget dispatch. Returns immediately with the number of
 * matching subscriptions; each delivery runs on its own microtask and
 * retries with exponential backoff on 5xx / transport errors.
 */
export async function dispatchEvent(
  event: WebhookEvent,
  payload: unknown,
  opts: DispatchOptions = {},
) {
  const corrId = opts.corrId ?? randomUUID();
  const body = JSON.stringify({ event, payload, corrId, ts: Date.now() });
  const targets = (await listSubscriptions()).filter((s) =>
    s.events.includes(event),
  );

  const resolved: Required<Pick<DispatchOptions, "timeoutMs" | "maxAttempts" | "backoffMs">> = {
    timeoutMs: opts.timeoutMs ?? 5_000,
    maxAttempts: opts.maxAttempts ?? DEFAULT_BACKOFF_MS.length,
    backoffMs: opts.backoffMs ?? DEFAULT_BACKOFF_MS,
  };

  for (const sub of targets) {
    void deliverWithRetry(sub, body, event, corrId, resolved);
  }

  return { dispatched: targets.length, corrId };
}

// --- test helpers ----------------------------------------------------------

export async function __resetSubscriptions() {
  store = new MemorySubscriptionStore();
}
