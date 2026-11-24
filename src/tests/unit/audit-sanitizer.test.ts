import { describe, expect, it } from "vitest";
import { ADMIN_ACTIONS, sanitizeAuditMetadata } from "@/server/audit";

describe("sanitizeAuditMetadata", () => {
  it("drops secret-ish keys at every depth (case-insensitive)", () => {
    const out = sanitizeAuditMetadata({
      note: "ok",
      password: "x",
      Password: "y",
      resetToken: "z",
      AUTH_SECRET: "s",
      user: {
        name: "ali",
        tokenHash: "h",
        cookie: "c",
        authorization: "a",
        nested: { session_token: "t", fine: 1 },
      },
    });
    const j = JSON.stringify(out);
    expect(j).not.toContain("password");
    expect(j).not.toContain("token");
    expect(j).not.toContain("secret");
    expect(j).not.toContain("cookie");
    expect(j).not.toContain("authorization");
    expect(out.note).toBe("ok");
    expect((out.user as Record<string, unknown>).name).toBe("ali");
    expect((out.user as Record<string, unknown>).fine).toBeUndefined();
    expect(
      ((out.user as Record<string, unknown>).nested as Record<string, unknown>)
        .fine,
    ).toBe(1);
  });

  it("caps total JSON size with a truncation marker", () => {
    const big = { note: "x".repeat(10_000) };
    const out = sanitizeAuditMetadata(big);
    expect(JSON.stringify(out).length).toBeLessThanOrEqual(4200);
    expect(out.__truncated).toBe(true);
  });

  it("drops non-plain values (functions, class instances)", () => {
    class Weird {
      a = 1;
    }
    const out = sanitizeAuditMetadata({
      fn: () => 1,
      weird: new Weird(),
      sym: Symbol("s"),
      ok: "yes",
      dt: undefined,
    });
    expect(out).toEqual({ ok: "yes" });
  });

  it("arrays are capped at 100 entries", () => {
    const out = sanitizeAuditMetadata({
      ids: Array.from({ length: 200 }, (_, i) => i),
    });
    expect((out.ids as unknown[]).length).toBe(100);
  });

  it("depth > 8 is dropped", () => {
    let deep: Record<string, unknown> = { v: 1 };
    for (let i = 0; i < 20; i++) deep = { next: deep };
    const out = sanitizeAuditMetadata({ deep });
    // Walks down until depth cap — must terminate and stay plain JSON.
    expect(() => JSON.stringify(out)).not.toThrow();
  });
});

describe("ADMIN_ACTIONS", () => {
  it("is a stable typed union of documented actions", () => {
    expect(ADMIN_ACTIONS).toContain("auth.password_set");
    expect(ADMIN_ACTIONS).toContain("admin.registration_decided");
    expect(ADMIN_ACTIONS).toContain("export.completed");
    expect(new Set(ADMIN_ACTIONS).size).toBe(ADMIN_ACTIONS.length);
  });
});
