import { randomUUID } from "node:crypto";

export const CORRELATION_ID_HEADER = "x-correlation-id";

export function getCorrelationId(headers: Record<string, unknown>): string {
  const incoming = headers[CORRELATION_ID_HEADER];
  if (typeof incoming === "string" && incoming.length > 0 && incoming.length <= 128) {
    return incoming;
  }
  return randomUUID();
}

// --- Axiom event stream -----------------------------------------------------

const AXIOM_TOKEN = process.env.AXIOM_TOKEN;
const AXIOM_DATASET = process.env.AXIOM_DATASET;
const AXIOM_ORG_ID = process.env.AXIOM_ORG_ID;

export const axiomConfigured = Boolean(AXIOM_TOKEN && AXIOM_DATASET);

export type EventRecord = {
  event: string;
  corrId: string;
  ts?: string;
  [key: string]: unknown;
};

async function shipToAxiom(records: EventRecord[]): Promise<void> {
  if (!axiomConfigured) return;
  const url = `https://api.axiom.co/v1/datasets/${encodeURIComponent(AXIOM_DATASET!)}/ingest`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${AXIOM_TOKEN}`,
    "Content-Type": "application/json",
  };
  if (AXIOM_ORG_ID) headers["X-Axiom-Org-Id"] = AXIOM_ORG_ID;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(records.map((r) => ({ _time: r.ts ?? new Date().toISOString(), ...r }))),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // eslint-disable-next-line no-console
      console.warn(`[observability] axiom ingest failed: ${res.status} ${body}`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[observability] axiom ingest error:`, err);
  }
}

export interface Logger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
}

/**
 * Record a structured event. Always writes a local log line (via the provided
 * Fastify-style logger) and — when AXIOM_TOKEN + AXIOM_DATASET are set — ships
 * a copy to Axiom. Fire-and-forget; never blocks the caller.
 */
export function logEvent(logger: Logger, record: EventRecord): void {
  const ts = record.ts ?? new Date().toISOString();
  const enriched: EventRecord = { ...record, ts };
  logger.info(enriched, record.event);
  void shipToAxiom([enriched]);
}
