import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  __resetSubscriptions,
  createSubscription,
  deleteSubscription,
  dispatchEvent,
  listSubscriptions,
  signBody,
  verifySignature,
} from "./webhooks.js";

describe("subscriptions", () => {
  beforeEach(() => __resetSubscriptions());

  it("creates a subscription with a generated secret", () => {
    const sub = createSubscription("https://example.com/hook", ["attestation.created"]);
    expect(sub.id).toBeDefined();
    expect(sub.secret).toHaveLength(64); // 32 bytes hex
    expect(sub.events).toEqual(["attestation.created"]);
  });

  it("rejects non-http(s) urls", () => {
    expect(() =>
      createSubscription("ftp://nope", ["attestation.created"]),
    ).toThrow(/http/);
  });

  it("lists and deletes subscriptions", () => {
    const a = createSubscription("https://a.test/hook", ["attestation.created"]);
    createSubscription("https://b.test/hook", ["attestation.created"]);
    expect(listSubscriptions()).toHaveLength(2);
    expect(deleteSubscription(a.id)).toBe(true);
    expect(listSubscriptions()).toHaveLength(1);
    expect(deleteSubscription("missing")).toBe(false);
  });
});

describe("signatures", () => {
  it("round-trips HMAC-SHA256 with constant-time verify", () => {
    const body = JSON.stringify({ hello: "world" });
    const sig = signBody(body, "topsecret");
    expect(sig.startsWith("sha256=")).toBe(true);
    expect(verifySignature(body, "topsecret", sig)).toBe(true);
    expect(verifySignature(body, "wrongsecret", sig)).toBe(false);
    expect(verifySignature(body + "x", "topsecret", sig)).toBe(false);
  });
});

describe("dispatchEvent", () => {
  beforeEach(() => __resetSubscriptions());
  afterEach(() => vi.restoreAllMocks());

  it("POSTs to matching subscriptions with headers + signature", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    createSubscription("https://match.test/hook", ["attestation.created"]);

    const { dispatched } = dispatchEvent("attestation.created", { foo: "bar" });
    expect(dispatched).toBe(1);

    // let the microtask queue drain so the POST resolves
    await new Promise((r) => setTimeout(r, 5));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://match.test/hook");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Yieldfy-Event"]).toBe("attestation.created");
    expect(init.headers["X-Yieldfy-Signature"]).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it("skips subscriptions that don't match the event", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    // a subscription to a different event (cast so we can prove filtering works
    // even if more events get added later)
    const forOther = createSubscription(
      "https://match.test/hook",
      ["attestation.created"],
    );
    // mutate to simulate "unrelated subscription"
    forOther.events = [] as never;

    const { dispatched } = dispatchEvent("attestation.created", {});
    expect(dispatched).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
