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
  beforeEach(async () => {
    await __resetSubscriptions();
  });

  it("creates a subscription with a generated secret", async () => {
    const sub = await createSubscription("https://example.com/hook", [
      "attestation.created",
    ]);
    expect(sub.id).toBeDefined();
    expect(sub.secret).toHaveLength(64);
    expect(sub.events).toEqual(["attestation.created"]);
  });

  it("rejects non-http(s) urls", async () => {
    await expect(
      createSubscription("ftp://nope", ["attestation.created"]),
    ).rejects.toThrow(/http/);
  });

  it("lists and deletes subscriptions", async () => {
    const a = await createSubscription("https://a.test/hook", ["attestation.created"]);
    await createSubscription("https://b.test/hook", ["attestation.created"]);
    expect(await listSubscriptions()).toHaveLength(2);
    expect(await deleteSubscription(a.id)).toBe(true);
    expect(await listSubscriptions()).toHaveLength(1);
    expect(await deleteSubscription("missing")).toBe(false);
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
  beforeEach(async () => {
    await __resetSubscriptions();
  });
  afterEach(() => vi.restoreAllMocks());

  it("POSTs to matching subscriptions with headers + signature", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await createSubscription("https://match.test/hook", ["attestation.created"]);

    const { dispatched } = await dispatchEvent("attestation.created", { foo: "bar" });
    expect(dispatched).toBe(1);

    await new Promise((r) => setTimeout(r, 5));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://match.test/hook");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Yieldfy-Event"]).toBe("attestation.created");
    expect(init.headers["X-Yieldfy-Signature"]).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it("retries on 5xx up to maxAttempts then gives up", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("bad", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    await createSubscription("https://fail.test/hook", ["attestation.created"]);

    await dispatchEvent("attestation.created", {}, {
      maxAttempts: 3,
      backoffMs: [1, 1, 1],
    });

    // give the retries time to burn through
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry on 4xx", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("bad", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await createSubscription("https://fail.test/hook", ["attestation.created"]);

    await dispatchEvent("attestation.created", {}, {
      maxAttempts: 3,
      backoffMs: [1, 1, 1],
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
