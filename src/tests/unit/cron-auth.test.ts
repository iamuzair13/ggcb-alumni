import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Cron auth (spec §4.7) — tested at two levels:
 *  1. pure helper: validCronSecret (fail-closed, constant-time)
 *  2. source-level: the route module must use timingSafeEqual + no session.
 */
import { validCronSecret } from "@/app/api/cron/email-outbox/route";

const SECRET = "c".repeat(40);

describe("validCronSecret", () => {
  it("missing secret fails closed — EVERYTHING is 401", () => {
    for (const h of [null, "", "Bearer x", `Bearer ${SECRET}`]) {
      expect(validCronSecret(h, undefined)).toBe(false);
    }
  });
  it("requires the Bearer scheme", () => {
    expect(validCronSecret(SECRET, SECRET)).toBe(false);
    expect(validCronSecret(`Basic ${SECRET}`, SECRET)).toBe(false);
    expect(validCronSecret("Bearer", SECRET)).toBe(false);
    expect(validCronSecret("Bearer ", SECRET)).toBe(false);
  });
  it("wrong secret rejected", () => {
    expect(
      validCronSecret(
        "Bearer wrong-wrong-wrong-wrong-wrong-wrong-wrong-",
        SECRET,
      ),
    ).toBe(false);
  });
  it("wrong length rejected", () => {
    expect(validCronSecret("Bearer short", SECRET)).toBe(false);
    expect(validCronSecret(`Bearer ${SECRET}${SECRET}`, SECRET)).toBe(false);
  });
  it("correct secret accepted", () => {
    expect(validCronSecret(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });
});

describe("route module wiring (source assertions)", () => {
  const src = readFileSync(
    join(process.cwd(), "src/app/api/cron/email-outbox/route.ts"),
    "utf8",
  );
  it("uses timingSafeEqual — constant-time compare", () => {
    expect(src).toContain("timingSafeEqual");
  });
  it("never consults sessions, roles, or cookies", () => {
    for (const bad of [
      "getSession",
      "requireUser",
      "requireRole",
      "auth()",
      "cookies(",
      "role ===",
      "getCurrentUser",
    ]) {
      expect(src).not.toContain(bad);
    }
  });
  it("is dynamic + no-store aware", () => {
    // Cache Components: `await connection()` marks it dynamic; the
    // `export const dynamic` segment config is rejected by Next 16.
    expect(src).not.toContain('dynamic = "force-dynamic"');
    expect(src).toContain("await connection()");
    expect(src).toContain("no-store");
    expect(src).toContain("maxDuration");
  });
});
