import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  renderMatrixMarkdown,
  expectedOutcome,
  PERSONAS,
} from "@/server/auth/matrix";
import { ROUTE_POLICY } from "@/server/auth/route-policy";

describe("authz matrix", () => {
  it("docs/security/authz-matrix.md is up to date (snapshot — run pnpm authz:matrix)", () => {
    const onDisk = readFileSync(
      join(process.cwd(), "docs", "security", "authz-matrix.md"),
      "utf8",
    );
    expect(onDisk).toBe(renderMatrixMarkdown());
  });

  it("every persona × route produces a known outcome token", () => {
    const known = /^(200|401|403|404 \(prod\)|→ )/;
    for (const p of ROUTE_POLICY) {
      for (const persona of PERSONAS) {
        expect(expectedOutcome(p.pattern, p.kind, persona)).toMatch(known);
      }
    }
  });

  it("key cells match the policy intent", () => {
    // /admin/users is superadmin-only.
    expect(expectedOutcome("/admin/users", "page", "admin")).toBe("403");
    expect(expectedOutcome("/admin/users", "page", "superadmin")).toBe("200");
    // Anonymous page access → login redirect; api → 401.
    expect(expectedOutcome("/admin", "page", "anonymous")).toBe("→ /login");
    expect(expectedOutcome("/api/auth/me", "api", "anonymous")).toBe("401");
    // Guest-only pages bounce signed-in users to their home.
    expect(expectedOutcome("/login", "page", "alumni-verified")).toBe(
      "→ /dashboard",
    );
    expect(expectedOutcome("/login", "page", "admin")).toBe("→ /admin");
    // Alumni area: staff can't reach it.
    expect(expectedOutcome("/dashboard", "page", "admin")).toBe("403");
    // Dev-only surface is a 404 in production.
    expect(expectedOutcome("/design", "page", "superadmin")).toBe("404 (prod)");
  });
});
