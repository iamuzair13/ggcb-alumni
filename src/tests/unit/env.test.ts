import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REQUIRED_ENV: Record<string, string> = {
  DATABASE_URL: "postgresql://pooler.example.com:6543/postgres",
  DIRECT_URL: "postgresql://db.example.com:5432/postgres",
  AUTH_SECRET: "a".repeat(32),
  AUTH_URL: "https://alumni.example.com",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_USER: "mailer",
  SMTP_PASSWORD: "s3cr3t",
  FROM_EMAIL: "alumni@ggcb.example.com",
  SUPABASE_URL: "https://xyz.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  STORAGE_BUCKET_PRIVATE: "ggcb-private",
  CRON_SECRET: "c".repeat(40),
};

function stubEnv(overrides: Record<string, string | undefined> = {}) {
  const env: Record<string, string | undefined> = {
    NODE_ENV: "test",
    ...REQUIRED_ENV,
    ...overrides,
  };
  vi.stubEnv("DATABASE_URL", env.DATABASE_URL!);
  // stub everything we care about
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(key, undefined as never);
    else vi.stubEnv(key, value);
  }
  // ensure phase/skip flags are off unless explicitly set
}

async function importServerEnv() {
  vi.resetModules();
  return import("@/lib/config/env.server");
}

describe("server env validation", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("parses a fully-populated environment", async () => {
    stubEnv();
    const { getServerEnv } = await importServerEnv();
    const env = getServerEnv();
    expect(env.DATABASE_URL).toContain("postgresql://");
    expect(env.SMTP_PORT).toBe(587);
  });

  it("warns (does not throw) outside production when vars are missing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.DATABASE_URL;
    delete process.env.DIRECT_URL;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getServerEnv } = await importServerEnv();
    getServerEnv();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("incomplete"));
  });

  it("throws in production when required vars are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.DATABASE_URL;
    const { getServerEnv } = await importServerEnv();
    expect(() => getServerEnv()).toThrowError(
      /Invalid server environment variables/,
    );
  });

  it("honours SKIP_ENV_VALIDATION even in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
    delete process.env.AUTH_SECRET;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getServerEnv } = await importServerEnv();
    expect(() => getServerEnv()).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  it("rejects malformed values (bad URL, short secret)", async () => {
    stubEnv({ AUTH_SECRET: "short", SMTP_PORT: "not-a-number" });
    vi.stubEnv("NODE_ENV", "production");
    const { getServerEnv } = await importServerEnv();
    expect(() => getServerEnv()).toThrowError();
  });

  it("public env parses NEXT_PUBLIC_APP_URL optionally", async () => {
    vi.resetModules();
    const { publicEnv } = await import("@/lib/config/env.public");
    expect(publicEnv.NEXT_PUBLIC_APP_URL).toBeUndefined();
  });
});
