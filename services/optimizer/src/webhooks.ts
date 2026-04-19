import { createHmac, randomUUID, randomBytes, timingSafeEqual } from "node:crypto";
import { webhookDispatchTotal } from "./metrics.js";

export type WebhookEvent = "attestation.created";

export type Subscription = {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  createdAt: string;
};

// In-memory store — swap for Redis / Postgres at production cut.
const subs = new Map<string, Subscription>();

export function listSubscriptions(): Subscription[] {
  return Array.from(subs.values());
}

export function createSubscription(
  url: string,
  events: WebhookEvent[],
  secret?: string,
): Subscription {
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
  subs.set(sub.id, sub);
  return sub;
}

export function deleteSubscription(id: string): boolean {
  return subs.delete(id);
}

export function signBody(body: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

/** Constant-time verify, exposed for tests and inbound verification helpers. */
export function verifySignature(body: string, secret: string, header: string): boolean {
  const expected = signBody(body, secret);
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type DispatchOptions = { timeoutMs?: number };

async function post(sub: Subscription, body: string, event: WebhookEvent, opts: DispatchOptions) {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), opts.timeoutMs ?? 5_000);
  try {
    const res = await fetch(sub.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Yieldfy-Event": event,
        "X-Yieldfy-Delivery": randomUUID(),
        "X-Yieldfy-Signature": signBody(body, sub.secret),
      },
      body,
      signal: controller.signal,
    });
    const klass = `${Math.floor(res.status / 100)}xx`;
    webhookDispatchTotal.inc({ status: klass, event });
    return res.status;
  } catch (err) {
    webhookDispatchTotal.inc({ status: "err", event });
    throw err;
  } finally {
    clearTimeout(to);
  }
}

/**
 * Fire-and-forget: returns immediately; dispatches to each matching subscription
 * in parallel without blocking the caller's response.
 */
export function dispatchEvent(event: WebhookEvent, payload: unknown, opts: DispatchOptions = {}) {
  const body = JSON.stringify({ event, payload, ts: Date.now() });
  const targets = listSubscriptions().filter((s) => s.events.includes(event));
  for (const sub of targets) {
    post(sub, body, event, opts).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn(`[webhooks] dispatch to ${sub.url} failed:`, err);
    });
  }
  return { dispatched: targets.length };
}

/** Test hook — wipe the in-memory store between specs. */
export function __resetSubscriptions() {
  subs.clear();
}
