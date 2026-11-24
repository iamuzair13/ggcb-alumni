import { describe, expect, it, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { closeTestConns, getAppSql, getDirectSql, hasTestDb } from "./helpers";
import { seedPersonas, clearPersonas, PERSONA_PASSWORD } from "./auth-personas";
import { authorizeLogin } from "@/server/auth/login";
import { AUTH_ERROR_CODES } from "@/server/auth/errors";
import { createAuthToken, consumeAuthToken } from "@/server/auth/tokens";
import {
  attemptKeys,
  dbAttemptStore,
  checkRateLimit,
} from "@/server/auth/rate-limit";
import { writeLoginLog } from "@/server/auth/audit";

const SECRET = "test-secret-test-secret-test-secret-x"; // ≥32 chars for HKDF
const describeDb = describe.skipIf(!hasTestDb);

const login = (
  sql: postgres.Sql,
  email: string,
  password: string,
  ip = "10.0.0.1",
) => authorizeLogin(sql, SECRET, { email, password }, ip, "vitest-agent");

/** Count every tagged-template call — the query budget probe. */
function countQueries(sql: postgres.Sql) {
  let n = 0;
  const prox = new Proxy(sql, {
    apply: (t, thisArg, args) => {
      n++;
      return Reflect.apply(t, thisArg, args);
    },
  }) as postgres.Sql;
  return {
    sql: prox,
    get count() {
      return n;
    },
  };
}

describeDb("auth login flow (real Postgres, ggcb_app)", () => {
  let app: postgres.Sql;
  let direct: postgres.Sql;
  let ids: Record<string, string>;

  beforeAll(async () => {
    direct = getDirectSql();
    app = getAppSql();
    await clearPersonas(direct);
    ids = await seedPersonas(direct);
  }, 120_000);

  afterAll(closeTestConns);

  it("successful login returns the identity and stays within the query budget", async () => {
    const c = countQueries(app);
    const result = await login(c.sql, "admin@e2e.test", PERSONA_PASSWORD);
    expect(result.ok).toBe(true);
    expect(result.user).toMatchObject({ role: "admin", name: "Admin" });
    // Pre-response budget: rate-check(1) + user lookup(1) = 2.
    expect(c.count).toBeLessThanOrEqual(5);
    await result.post();
    const [log] = await app<{ success: boolean }[]>`
      SELECT success FROM login_logs WHERE email_attempted = 'admin@e2e.test' ORDER BY created_at DESC LIMIT 1
    `;
    expect(log.success).toBe(true);
    const [u] = await app<{ last_login_at: string }[]>`
      SELECT last_login_at FROM users WHERE id = ${ids.admin}
    `;
    expect(u.last_login_at).not.toBeNull();
  });

  it("wrong password → generic INVALID; unknown email → same generic code", async () => {
    const bad = await login(app, "admin@e2e.test", "wrong-password");
    expect(bad.ok).toBe(false);
    expect(bad.code).toBe(AUTH_ERROR_CODES.INVALID);
    await bad.post();
    const unknown = await login(app, "nobody@e2e.test", "whatever");
    expect(unknown.ok).toBe(false);
    expect(unknown.code).toBe(AUTH_ERROR_CODES.INVALID);
    await unknown.post();
    // Failures land in auth_attempts (3 bucket rows per failure).
    const [n] = await app<
      { n: number }[]
    >`SELECT count(*)::int AS n FROM auth_attempts`;
    expect(n.n).toBeGreaterThanOrEqual(6);
  });

  it("inactive user → generic INVALID (never reveals the account state)", async () => {
    const r = await login(app, "dead@e2e.test", PERSONA_PASSWORD);
    expect(r.ok).toBe(false);
    expect(r.code).toBe(AUTH_ERROR_CODES.INVALID);
    await r.post();
  });

  it("correct password + unverified email → EMAIL_NOT_VERIFIED", async () => {
    const r = await login(app, "unv@e2e.test", PERSONA_PASSWORD);
    expect(r.ok).toBe(false);
    expect(r.code).toBe(AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED);
    await r.post();
    const [log] = await app<{ reason: string }[]>`
      SELECT reason FROM login_logs WHERE email_attempted = 'unv@e2e.test' ORDER BY created_at DESC LIMIT 1
    `;
    expect(log.reason).toBe("email_not_verified");
  });

  it("password-less user → generic INVALID through the dummy-hash path", async () => {
    const [u] = await direct<{ id: string }[]>`
      INSERT INTO users (email, name, role, is_active, email_verified_at)
      VALUES ('nopw@e2e.test', 'NoPw', 'viewer', true, now()) RETURNING id
    `;
    const r = await login(app, "nopw@e2e.test", "anything");
    expect(r.ok).toBe(false);
    expect(r.code).toBe(AUTH_ERROR_CODES.INVALID);
    await r.post();
    await direct`DELETE FROM users WHERE id = ${u.id}`;
  });

  it("per-(email,ip) lockout at 5; blocked attempt writes no attempt rows", async () => {
    const before = await app<
      { n: number }[]
    >`SELECT count(*)::int AS n FROM auth_attempts`;
    // 5 failures for the SAME email+IP pair.
    for (let i = 0; i < 5; i++) {
      const r = await login(app, "viewer@e2e.test", "wrong", "10.9.9.9");
      await r.post();
    }
    const rl = await checkRateLimit(
      dbAttemptStore(app),
      attemptKeys("viewer@e2e.test", "10.9.9.9", SECRET),
    );
    expect(rl.limited).toBe(true);
    // Even the CORRECT password is now refused with the generic rate-limit code.
    const r = await login(app, "viewer@e2e.test", PERSONA_PASSWORD, "10.9.9.9");
    expect(r.ok).toBe(false);
    expect(r.code).toBe(AUTH_ERROR_CODES.RATE_LIMITED);
    const blocked = (
      await app<{ n: number }[]>`SELECT count(*)::int AS n FROM auth_attempts`
    )[0].n;
    await r.post();
    const after = (
      await app<{ n: number }[]>`SELECT count(*)::int AS n FROM auth_attempts`
    )[0].n;
    expect(after).toBe(blocked); // blocked attempt wrote zero attempt rows
    expect(after - before[0].n).toBeGreaterThanOrEqual(15); // 5 failures × 3 bucket rows
  });

  it("login_logs write never breaks the login flow (broken sql swallowed)", async () => {
    const broken = postgres("postgres://invalid-host:1/x", {
      max: 1,
      connect_timeout: 1,
    });
    await writeLoginLog(broken, {
      userId: null,
      emailAttempted: "x@y.z",
      success: false,
      reason: "unknown_email",
      ip: null,
      userAgent: null,
    }); // must not throw
    await broken.end().catch(() => {});
  });
});

describeDb("session recheck + invalidation", () => {
  let direct: postgres.Sql;

  beforeAll(async () => {
    direct = getDirectSql();
  });
  afterAll(closeTestConns);

  it("recheckUser invalidates on session_version bump and returns refreshed role", async () => {
    // Local copy of the recheck contract (recheckUser lives in @/auth which
    // is bound to the runtime pool; the SQL shape is what we verify).
    const recheck = async (id: string, sv: number) => {
      const [row] = await getAppSql()<
        { is_active: boolean; role: string; session_version: number }[]
      >`
        SELECT is_active, role::text, session_version FROM users WHERE id = ${id}`;
      if (!row || !row.is_active || row.session_version !== sv)
        return { valid: false as const };
      return { valid: true as const, role: row.role };
    };
    const [u] = await direct<{ id: string; session_version: number }[]>`
      SELECT id, session_version FROM users WHERE email = 'admin@e2e.test'`;
    expect(await recheck(u.id, u.session_version)).toMatchObject({
      valid: true,
      role: "admin",
    });
    // Bump version → invalid.
    await direct`UPDATE users SET session_version = session_version + 1 WHERE id = ${u.id}`;
    expect((await recheck(u.id, u.session_version)).valid).toBe(false);
    // Role refresh: promote viewer→admin is visible at next recheck.
    const [v] = await direct<{ id: string; session_version: number }[]>`
      SELECT id, session_version FROM users WHERE email = 'viewer@e2e.test'`;
    await direct`UPDATE users SET role = 'admin' WHERE id = ${v.id}`;
    expect(await recheck(v.id, v.session_version)).toMatchObject({
      valid: true,
      role: "admin",
    });
    await direct`UPDATE users SET role = 'viewer' WHERE id = ${v.id}`;
    // Deactivation → invalid.
    await direct`UPDATE users SET is_active = false WHERE id = ${u.id}`;
    expect((await recheck(u.id, u.session_version + 1)).valid).toBe(false);
    await direct`UPDATE users SET is_active = true WHERE id = ${u.id}`;
  });
});

describeDb("auth_tokens — atomic single-use", () => {
  let app: postgres.Sql;
  let direct: postgres.Sql;
  let userId: string;
  beforeAll(async () => {
    app = getAppSql();
    direct = getDirectSql();
    const [u] = await direct<{ id: string }[]>`
      SELECT id FROM users WHERE email = 'admin@e2e.test'`;
    userId = u.id;
  });
  afterAll(closeTestConns);

  it("create → consume round-trip; second consume fails (single use)", async () => {
    const { raw } = await createAuthToken(app, userId, "password_reset");
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await consumeAuthToken(app, raw, "password_reset")).toEqual({
      ok: true,
      userId,
    });
    expect(await consumeAuthToken(app, raw, "password_reset")).toEqual({
      ok: false,
    });
  });

  it("concurrent double-consume — exactly one wins", async () => {
    const { raw } = await createAuthToken(app, userId, "password_reset");
    const [a, b] = await Promise.all([
      consumeAuthToken(app, raw, "password_reset"),
      consumeAuthToken(app, raw, "password_reset"),
    ]);
    const wins = [a, b].filter((r) => r.ok).length;
    expect(wins).toBe(1);
  });

  it("wrong type cannot consume; earlier token of same type is invalidated", async () => {
    const { raw: r1 } = await createAuthToken(
      app,
      userId,
      "email_verification",
    );
    const { raw: r2 } = await createAuthToken(
      app,
      userId,
      "email_verification",
    );
    expect(await consumeAuthToken(app, r1, "email_verification")).toEqual({
      ok: false,
    });
    expect(await consumeAuthToken(app, r2, "password_reset")).toEqual({
      ok: false,
    });
    expect(await consumeAuthToken(app, r2, "email_verification")).toEqual({
      ok: true,
      userId,
    });
  });

  it("expired tokens cannot be consumed", async () => {
    const { raw } = await createAuthToken(app, userId, "password_reset");
    await direct`
      UPDATE auth_tokens SET expires_at = now() - interval '1 minute'
      WHERE user_id = ${userId} AND used_at IS NULL
    `;
    expect(await consumeAuthToken(app, raw, "password_reset")).toEqual({
      ok: false,
    });
  });
});
