import { describe, expect, it } from "vitest";
import {
  RATE_LIMIT,
  attemptKeys,
  checkRateLimit,
  recordAttempt,
  type AttemptKeys,
  type RateLimitStore,
} from "@/server/auth/rate-limit";

/** In-memory store satisfying the RateLimitStore interface. */
function makeStore(counts = { pair: 0, ip: 0, email: 0 }) {
  const inserted: { kind: string; keyHash: string; succeeded: boolean }[][] =
    [];
  let lastWindowStart: Date | undefined;
  const store: RateLimitStore = {
    async bucketCounts(_keys, windowStart) {
      lastWindowStart = windowStart;
      return { ...counts };
    },
    async insert(rows) {
      inserted.push(rows);
    },
    async purge() {},
  };
  return { store, inserted, windowStart: () => lastWindowStart };
}

const keys: AttemptKeys = { email: "eh", ip: "ih", pair: "ph" };

describe("rate-limit check (three buckets, 15-min rolling window)", () => {
  it("is unlimited below every threshold", async () => {
    const { store } = makeStore({ pair: 4, ip: 29, email: 19 });
    expect((await checkRateLimit(store, keys)).limited).toBe(false);
  });
  it("blocks at the per-(email,ip) threshold", async () => {
    const { store } = makeStore({
      pair: RATE_LIMIT.EMAIL_IP_MAX,
      ip: 0,
      email: 0,
    });
    expect((await checkRateLimit(store, keys)).limited).toBe(true);
  });
  it("blocks at the per-IP threshold", async () => {
    const { store } = makeStore({ pair: 0, ip: RATE_LIMIT.IP_MAX, email: 0 });
    expect((await checkRateLimit(store, keys)).limited).toBe(true);
  });
  it("blocks at the per-email threshold", async () => {
    const { store } = makeStore({
      pair: 0,
      ip: 0,
      email: RATE_LIMIT.EMAIL_MAX,
    });
    expect((await checkRateLimit(store, keys)).limited).toBe(true);
  });
  it("queries a window ~15 minutes back", async () => {
    const s = makeStore();
    await checkRateLimit(s.store, keys, new Date("2026-01-01T12:00:00Z"));
    expect(s.windowStart()?.getTime()).toBe(
      new Date("2026-01-01T11:45:00Z").getTime(),
    );
  });
});

describe("recordAttempt — bucket writes", () => {
  it("a failure writes exactly ONE insert with 3 bucket rows", async () => {
    const { store, inserted } = makeStore();
    await recordAttempt(store, keys, "failed");
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toHaveLength(3);
    expect(inserted[0].map((r) => r.keyHash)).toEqual([
      keys.pair,
      keys.ip,
      keys.email,
    ]);
    expect(inserted[0].every((r) => r.kind === "login" && !r.succeeded)).toBe(
      true,
    );
  });
  it("a BLOCKED attempt writes NOTHING (prevents self-sustaining lockout)", async () => {
    const { store, inserted } = makeStore();
    await recordAttempt(store, keys, "blocked");
    expect(inserted).toHaveLength(0);
  });
  it("a success writes NOTHING (failures age out)", async () => {
    const { store, inserted } = makeStore();
    await recordAttempt(store, keys, "success");
    expect(inserted).toHaveLength(0);
  });
});

describe("attemptKeys — HMAC'd dimension keys", () => {
  it("produces three distinct 64-hex hashes encoding email/ip/pair", () => {
    const k = attemptKeys("a@b.c", "1.2.3.4", "secret");
    expect(k.email).toMatch(/^[0-9a-f]{64}$/);
    expect(k.ip).toMatch(/^[0-9a-f]{64}$/);
    expect(k.pair).toMatch(/^[0-9a-f]{64}$/);
    expect(new Set([k.email, k.ip, k.pair]).size).toBe(3);
  });
  it("normalises a missing IP to 'unknown'", () => {
    const a = attemptKeys("a@b.c", null, "s");
    const b = attemptKeys("a@b.c", "unknown", "s");
    expect(a.ip).toBe(b.ip);
  });
});
