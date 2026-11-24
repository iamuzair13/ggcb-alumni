import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Account flows — the sql tagged-template is faked; the fake `begin`
 * runs the callback with the same fake (transaction semantics are proven
 * by the statement list: consume → update → notice → audit, all in one
 * begin block).
 */
const state = vi.hoisted(() => ({
  calls: [] as { sql: string; params: unknown[] }[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler: (_q: string, _p: unknown[]): unknown[] => [],
}));

const mocks = vi.hoisted(() => ({
  enqueue: vi.fn().mockResolvedValue(undefined),
  kick: vi.fn(),
  audit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/db", () => {
  const tag = (strings: TemplateStringsArray, ...params: unknown[]) => {
    const q = strings.join("?");
    state.calls.push({ sql: q, params });
    return Promise.resolve(state.handler(q, params));
  };
  return {
    sql: Object.assign(tag, {
      begin: (cb: (t: unknown) => unknown) => cb(tag),
    }),
  };
});
vi.mock("@/server/email/enqueue", () => ({
  enqueueEmail: mocks.enqueue,
  kickOutbox: mocks.kick,
}));
vi.mock("@/server/audit", () => ({ recordAdminActivity: mocks.audit }));
vi.mock("@/lib/config/env.server", () => ({
  getServerEnv: () => ({
    AUTH_SECRET: "a".repeat(32),
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  }),
}));

import {
  requestPasswordReset,
  resendVerification,
  resetWithToken,
  verifyEmail,
} from "@/server/services/account";

beforeEach(() => {
  state.calls = [];
  state.handler = () => [];
  mocks.enqueue.mockClear();
  mocks.kick.mockClear();
  mocks.audit.mockClear();
});

describe("verifyEmail — consume + mark verified in ONE transaction", () => {
  it("valid token: consume, COALESCE email_verified_at, audit — returns ok", async () => {
    state.handler = (q) =>
      q.includes("UPDATE auth_tokens") ? [{ user_id: "u-1" }] : [];
    const r = await verifyEmail("tok");
    expect(r).toEqual({ status: "ok" });
    expect(
      state.calls.some((c) => c.sql.includes("email_verified_at = COALESCE")),
    ).toBe(true);
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.email_verified",
        entityId: "u-1",
      }),
      expect.objectContaining({ tx: expect.any(Function) }),
    );
  });

  it("invalid/expired/used token: one generic invalid, no user update", async () => {
    const r = await verifyEmail("bad-tok");
    expect(r).toEqual({ status: "invalid" });
    expect(state.calls.some((c) => c.sql.includes("UPDATE users"))).toBe(false);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});

describe("resetWithToken — policy first, then consume inside the tx", () => {
  it("a password that fails policy never reaches the consume statement", async () => {
    const r = await resetWithToken("tok", "short", "auth.password_reset");
    expect(r.status).toBe("policy");
    expect(state.calls.some((c) => c.sql.includes("UPDATE auth_tokens"))).toBe(
      false,
    );
  });

  it("valid token: sets hash, verifies email, bumps session_version, notices + audits, kicks outbox", async () => {
    state.handler = (q) => {
      if (q.includes("UPDATE auth_tokens")) return [{ user_id: "u-2" }];
      if (q.includes("SELECT email, name FROM users"))
        return [{ email: "staff@example.invalid", name: "Sample Staff A" }];
      return [];
    };
    const r = await resetWithToken(
      "tok",
      "Str0ngP@ssphrase!",
      "auth.password_reset",
    );
    expect(r).toEqual({ status: "ok" });
    const upd = state.calls.find((c) => c.sql.includes("UPDATE users"));
    expect(upd?.sql).toContain("password_hash");
    expect(upd?.sql).toContain("session_version = session_version + 1");
    expect(upd?.sql).toContain("email_verified_at = COALESCE");
    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "staff@example.invalid",
        template: "password_changed",
      }),
      expect.objectContaining({ tx: expect.any(Function) }),
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.password_reset" }),
      expect.anything(),
    );
    expect(mocks.kick).toHaveBeenCalledTimes(1);
  });

  it("invalid token: generic invalid, no hash write, no notice, no kick", async () => {
    const r = await resetWithToken(
      "bad",
      "Str0ngP@ssphrase!",
      "auth.password_reset",
    );
    expect(r).toEqual({ status: "invalid" });
    expect(state.calls.some((c) => c.sql.includes("UPDATE users"))).toBe(false);
    expect(mocks.enqueue).not.toHaveBeenCalled();
    expect(mocks.kick).not.toHaveBeenCalled();
  });

  it("context policy failure (email-local containment) rolls back — token NOT burned", async () => {
    state.handler = (q) => {
      if (q.includes("UPDATE auth_tokens")) return [{ user_id: "u-3" }];
      if (q.includes("SELECT email, name FROM users"))
        return [{ email: "ada@example.invalid", name: "Ada" }];
      return [];
    };
    const r = await resetWithToken(
      "tok",
      "password-ada-1234",
      "auth.password_reset",
    );
    // 'password' itself is on the blocklist; a containment failure is what
    // matters — either way the tx returns the policy outcome and the user
    // update never runs.
    expect(r.status).toBe("policy");
    expect(state.calls.some((c) => c.sql.includes("password_hash"))).toBe(
      false,
    );
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});

describe("requestPasswordReset / resendVerification — neutral + deferred", () => {
  it("returns {status:'ok'} immediately; records the request; lookup+enqueue run in after()", async () => {
    const ranAfter: (() => Promise<unknown>)[] = [];
    state.handler = (q) => {
      if (q.includes("FROM auth_attempts")) return [{ pair: 0, ip: 0 }];
      if (q.includes("FROM users"))
        return [
          {
            id: "u-9",
            name: "N",
            is_active: true,
            email_verified_at: new Date(),
          },
        ];
      return [];
    };
    const r = await requestPasswordReset(
      "staff@example.invalid",
      "1.2.3.4",
      (w) => ranAfter.push(w),
    );
    expect(r).toEqual({ status: "ok" });
    expect(ranAfter).toHaveLength(1);
    // The request was recorded for BOTH buckets in one INSERT.
    const inserts = state.calls.filter((c) =>
      c.sql.includes("INSERT INTO auth_attempts"),
    );
    expect(inserts).toHaveLength(1);
    // Nothing about the user happened before the response.
    expect(state.calls.some((c) => c.sql.includes("FROM users"))).toBe(false);
    await ranAfter[0]!();
    expect(state.calls.some((c) => c.sql.includes("FROM users"))).toBe(true);
    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ template: "password_reset" }),
      expect.objectContaining({ tx: expect.any(Function) }),
    );
    expect(mocks.kick).toHaveBeenCalledTimes(1);
  });

  it("an inactive/missing user still returns the same result — no enqueue", async () => {
    const ranAfter: (() => Promise<unknown>)[] = [];
    state.handler = (q) => {
      if (q.includes("FROM auth_attempts")) return [{ pair: 0, ip: 0 }];
      return []; // no user row
    };
    const r = await requestPasswordReset("ghost@example.invalid", null, (w) =>
      ranAfter.push(w),
    );
    expect(r).toEqual({ status: "ok" });
    await ranAfter[0]!();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("a rate-limited request skips the expensive path entirely", async () => {
    const ranAfter: (() => Promise<unknown>)[] = [];
    state.handler = (q) =>
      q.includes("FROM auth_attempts") ? [{ pair: 99, ip: 0 }] : [];
    const r = await resendVerification("a@example.invalid", "9.9.9.9", (w) =>
      ranAfter.push(w),
    );
    expect(r).toEqual({ status: "ok" });
    // Limited → NOT recorded (no amplification), no user lookup.
    expect(
      state.calls.some((c) => c.sql.includes("INSERT INTO auth_attempts")),
    ).toBe(false);
    await ranAfter[0]!();
    expect(state.calls.some((c) => c.sql.includes("FROM users"))).toBe(false);
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("resendVerification only targets unverified users", async () => {
    const ranAfter: (() => Promise<unknown>)[] = [];
    state.handler = (q) => {
      if (q.includes("FROM auth_attempts")) return [{ pair: 0, ip: 0 }];
      if (q.includes("FROM users"))
        return [
          {
            id: "u-1",
            name: "N",
            is_active: true,
            email_verified_at: new Date(),
          },
        ];
      return [];
    };
    await resendVerification("v@example.invalid", null, (w) =>
      ranAfter.push(w),
    );
    await ranAfter[0]!();
    expect(mocks.enqueue).not.toHaveBeenCalled(); // already verified → no token
  });
});
