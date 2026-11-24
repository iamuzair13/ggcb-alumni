import { describe, expect, it } from "vitest";
import {
  checkRequestLimit,
  recordRequest,
  REQUEST_LIMITS,
} from "@/server/auth/request-limits";
import type postgres from "postgres";

/** Fake sql tagged-template that returns configured rows and records calls. */
function fakeSql(rows: unknown[] = []) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const tag = (strings: TemplateStringsArray, ...params: unknown[]) => {
    calls.push({ sql: strings.join("?"), params });
    return Promise.resolve(rows);
  };
  return { fake: tag as unknown as postgres.Sql, calls };
}

const keys = { email: "eh", ip: "ih", pair: "ph" };

describe("request limits — every request counts (60-min window)", () => {
  it("queries counts for the pair + ip buckets in ONE statement", async () => {
    const { fake, calls } = fakeSql([{ pair: 0, ip: 0 }]);
    await checkRequestLimit(fake, "password_reset", keys);
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain("FROM auth_attempts");
    expect(calls[0].sql).toContain("kind");
    expect(calls[0].params).toContain("password_reset");
  });

  it("computes a 60-minute rolling window start", async () => {
    const { fake, calls } = fakeSql([{ pair: 0, ip: 0 }]);
    await checkRequestLimit(
      fake,
      "email_verify",
      keys,
      new Date("2026-03-01T12:00:00Z"),
    );
    const windowStart = calls[0].params.find(
      (p): p is Date => p instanceof Date,
    );
    expect(windowStart?.toISOString()).toBe("2026-03-01T11:00:00.000Z");
  });

  it("limits at the (email+ip) threshold of 3/hour", async () => {
    const { fake } = fakeSql([{ pair: REQUEST_LIMITS.PAIR_MAX, ip: 0 }]);
    expect(
      (await checkRequestLimit(fake, "password_reset", keys)).limited,
    ).toBe(true);
  });

  it("limits at the per-IP threshold of 20/hour", async () => {
    const { fake } = fakeSql([{ pair: 0, ip: REQUEST_LIMITS.IP_MAX }]);
    expect(
      (await checkRequestLimit(fake, "password_reset", keys)).limited,
    ).toBe(true);
  });

  it("does not limit under both thresholds", async () => {
    const { fake } = fakeSql([{ pair: 2, ip: 19 }]);
    expect(
      (await checkRequestLimit(fake, "password_reset", keys)).limited,
    ).toBe(false);
  });

  it("records BOTH bucket rows in one statement (unlike login, which writes on failure only)", async () => {
    const { fake, calls } = fakeSql();
    await recordRequest(fake, "email_verify", keys);
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain("INSERT INTO auth_attempts");
    // Pair and IP keys both present as rows — email is not a bucket for
    // request flows (a request is cost, not a credential guess).
    expect(calls[0].params.filter((p) => p === keys.pair)).toHaveLength(1);
    expect(calls[0].params.filter((p) => p === keys.ip)).toHaveLength(1);
    expect(calls[0].params).not.toContain(keys.email);
  });
});
