import { describe, expect, it } from "vitest";
import { createAuthToken, consumeAuthToken } from "@/server/auth/tokens";
import type postgres from "postgres";

/** Fake sql handle: captures params; configurable row results. */
function fakeSql(rows: unknown[] = []) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const tag = (strings: TemplateStringsArray, ...params: unknown[]) => {
    calls.push({ sql: strings.join("?"), params });
    return Promise.resolve(rows);
  };
  const fake = Object.assign(tag, {
    begin: (fn: (tx: postgres.TransactionSql) => Promise<void>) =>
      fn(tag as unknown as postgres.TransactionSql),
  }) as unknown as postgres.Sql;
  return { fake, calls };
}

describe("createAuthToken", () => {
  it("returns a 43-char base64url raw token and stores only the 64-hex hash", async () => {
    const { fake, calls } = fakeSql();
    const { raw } = await createAuthToken(fake, "user-1", "password_reset");
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 random bytes
    // Two statements inside the transaction: invalidate + insert.
    expect(calls).toHaveLength(2);
    expect(calls[0].sql).toContain("UPDATE auth_tokens SET used_at = now()");
    expect(calls[1].sql).toContain("INSERT INTO auth_tokens");
    const insertedHash = calls[1].params[2];
    expect(insertedHash).toMatch(/^[0-9a-f]{64}$/);
    expect(String(calls[1].params.join(" "))).not.toContain(raw);
  });

  it("email_verification tokens expire in 24h, password_reset in 1h", async () => {
    const { fake: f1, calls: c1 } = fakeSql();
    const { expiresAt: v } = await createAuthToken(
      f1,
      "u",
      "email_verification",
    );
    const { fake: f2, calls: c2 } = fakeSql();
    const { expiresAt: r } = await createAuthToken(f2, "u", "password_reset");
    expect(v.getTime() - Date.now()).toBeGreaterThan(23 * 3600_000);
    expect(r.getTime() - Date.now()).toBeLessThan(61 * 60_000);
    void c1;
    void c2;
  });
});

describe("consumeAuthToken — single atomic statement", () => {
  it("issues ONE update with used_at guard + RETURNING user_id", async () => {
    const { fake, calls } = fakeSql([{ user_id: "u-9" }]);
    const res = await consumeAuthToken(fake, "raw-token", "password_reset");
    expect(res).toEqual({ ok: true, userId: "u-9" });
    expect(calls).toHaveLength(1);
    const q = calls[0].sql;
    expect(q).toContain("UPDATE auth_tokens");
    expect(q).toContain("used_at IS NULL");
    expect(q).toContain("expires_at > now()");
    expect(q).toContain("RETURNING user_id");
  });
  it("returns ok:false for no matching row — without distinguishing why", async () => {
    const { fake } = fakeSql([]);
    const res = await consumeAuthToken(fake, "nope", "password_reset");
    expect(res).toEqual({ ok: false });
  });
});
