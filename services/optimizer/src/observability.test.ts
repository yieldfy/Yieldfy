import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CORRELATION_ID_HEADER,
  getCorrelationId,
  logEvent,
} from "./observability.js";

describe("getCorrelationId", () => {
  it("returns the incoming header when present and reasonable", () => {
    const id = getCorrelationId({ [CORRELATION_ID_HEADER]: "abc-123" });
    expect(id).toBe("abc-123");
  });

  it("generates a UUID when the header is missing", () => {
    const id = getCorrelationId({});
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("rejects oversized correlation ids and falls back to a UUID", () => {
    const huge = "x".repeat(200);
    const id = getCorrelationId({ [CORRELATION_ID_HEADER]: huge });
    expect(id).not.toBe(huge);
    expect(id.length).toBeLessThan(100);
  });
});

describe("logEvent", () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date("2026-04-19T00:00:00Z")));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("writes a structured info line with the event as message", () => {
    const info = vi.fn();
    logEvent({ info }, { event: "attestation.created", corrId: "cid-1", venue: "kamino" });

    expect(info).toHaveBeenCalledTimes(1);
    const [record, msg] = info.mock.calls[0];
    expect(msg).toBe("attestation.created");
    expect(record).toMatchObject({
      event: "attestation.created",
      corrId: "cid-1",
      venue: "kamino",
      ts: "2026-04-19T00:00:00.000Z",
    });
  });
});
