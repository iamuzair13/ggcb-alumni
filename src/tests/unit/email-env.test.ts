import { afterEach, describe, expect, it, vi } from "vitest";
import { parseServerEnvFor } from "@/lib/config/env.server";

/**
 * EMAIL_MODE validation matrix (spec §4.1):
 *   off → nothing required | log → dev/test only | smtp → full SMTP set
 *   non-off → NEXT_PUBLIC_APP_URL (https in prod) + CRON_SECRET ≥32 in prod
 */
const BASE = {
  DATABASE_URL: "postgresql://u:p@h/db",
  DIRECT_URL: "postgresql://u:p@h/db",
  AUTH_SECRET: "x".repeat(40),
  AUTH_URL: "http://localhost:3000",
};

const SMTP = {
  SMTP_HOST: "mail.example.com",
  SMTP_PORT: "587",
  SMTP_USER: "u",
  SMTP_PASSWORD: "p",
  SMTP_SECURE: "false",
  FROM_EMAIL: "noreply@example.com",
  FROM_NAME: "GGCB",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
};

function issues(env: Record<string, string>): string[] {
  const r = parseServerEnvFor({ ...BASE, ...env });
  return r.success
    ? []
    : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("EMAIL_MODE validation", () => {
  it("defaults to off — nothing email-related required", () => {
    expect(issues({})).toEqual([]);
  });

  it("off: smtp vars absent is fine; tuning defaults apply", () => {
    const r = parseServerEnvFor({ ...BASE });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.EMAIL_MODE).toBe("off");
      expect(r.data.EMAIL_BATCH_SIZE).toBe(20);
      expect(r.data.EMAIL_CONCURRENCY).toBe(2);
      expect(r.data.EMAIL_RUN_BUDGET_MS).toBe(20_000);
      expect(r.data.EMAIL_STALE_LOCK_SECONDS).toBe(300);
    }
  });

  it("log in development: passes, no SMTP vars needed", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(
      issues({
        EMAIL_MODE: "log",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }),
    ).toEqual([]);
  });

  it("log in production: REFUSED", () => {
    vi.stubEnv("NODE_ENV", "production");
    const out = issues({
      EMAIL_MODE: "log",
      NEXT_PUBLIC_APP_URL: "https://x.example.com",
      CRON_SECRET: "c".repeat(40),
    });
    expect(out.some((i) => i.includes("EMAIL_MODE"))).toBe(true);
  });

  it("smtp: missing each required var fails", () => {
    vi.stubEnv("NODE_ENV", "development");
    for (const key of [
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASSWORD",
      "SMTP_SECURE",
      "FROM_EMAIL",
      "FROM_NAME",
    ]) {
      const env = { ...SMTP, EMAIL_MODE: "smtp" } as Record<string, string>;
      delete env[key];
      expect(
        issues(env).some((i) => i.startsWith(key)),
        key,
      ).toBe(true);
    }
  });

  it("smtp with full config passes", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(issues({ ...SMTP, EMAIL_MODE: "smtp" })).toEqual([]);
  });

  it("non-off requires NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NODE_ENV", "development");
    const e = { EMAIL_MODE: "log" };
    expect(issues(e).some((i) => i.startsWith("NEXT_PUBLIC_APP_URL"))).toBe(
      true,
    );
  });

  it("production non-off requires https URL + CRON_SECRET >= 32", () => {
    vi.stubEnv("NODE_ENV", "production");
    const out = issues({
      ...SMTP,
      EMAIL_MODE: "smtp",
      NEXT_PUBLIC_APP_URL: "http://insecure.example.com",
    });
    expect(out.some((i) => i.includes("NEXT_PUBLIC_APP_URL"))).toBe(true);
    expect(out.some((i) => i.includes("CRON_SECRET"))).toBe(true);
  });

  it("production non-off with https + 32-char secret passes", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(
      issues({
        ...SMTP,
        EMAIL_MODE: "smtp",
        NEXT_PUBLIC_APP_URL: "https://alumni.example.edu.pk",
        CRON_SECRET: "c".repeat(40),
        AUTH_URL: "https://alumni.example.edu.pk",
      }),
    ).toEqual([]);
  });

  it("tuning bounds enforced", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(issues({ EMAIL_BATCH_SIZE: "0" }).length).toBeGreaterThan(0);
    expect(issues({ EMAIL_BATCH_SIZE: "501" }).length).toBeGreaterThan(0);
    expect(issues({ EMAIL_RUN_BUDGET_MS: "500" }).length).toBeGreaterThan(0);
  });
});
