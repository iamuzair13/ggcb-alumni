import { describe, expect, it } from "vitest";
import { readdirSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { policyFor, ROUTE_POLICY } from "@/server/auth/route-policy";

/**
 * Completeness: every page.* / route.* under src/app MUST have a matching
 * route-policy entry — adding a route without a policy entry fails this
 * test (and CI).
 */
const APP_DIR = join(process.cwd(), "src", "app");

function routePaths(root: string): { path: string; kind: "page" | "api" }[] {
  const out: { path: string; kind: "page" | "api" }[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const name = entry.name;
      if (entry.isDirectory()) {
        if (name.startsWith("(") && name.endsWith(")")) {
          walk(join(dir, name), prefix); // groups don't add a segment
        } else if (name.startsWith("[")) {
          walk(join(dir, name), prefix); // dynamic segments match at prefix level
        } else {
          walk(join(dir, name), `${prefix}/${name}`);
        }
      } else if (/^page\.(tsx?|jsx?)$/.test(name)) {
        out.push({ path: prefix || "/", kind: "page" });
      } else if (/^route\.(tsx?|jsx?)$/.test(name)) {
        out.push({ path: prefix, kind: "api" });
      }
    }
  };
  walk(root, "");
  return out;
}

describe("route-policy completeness", () => {
  const discovered = routePaths(APP_DIR);
  it("finds every existing route file", () => {
    expect(discovered.length).toBeGreaterThan(10);
  });
  it.each(discovered.map((r) => [r.path, r.kind] as const))(
    "%s (%s) has a policy entry",
    (path, kind) => {
      const p = policyFor(path);
      expect(p, `no ROUTE_POLICY entry covers ${path}`).toBeDefined();
      // `cron` is an api kind with bearer-secret auth (spec §4.7).
      const expected = p!.kind === "cron" ? "api" : p!.kind;
      expect(expected).toBe(kind);
    },
  );

  it("a route file missing from the policy is detected (fixture)", () => {
    const fixture = join(process.cwd(), ".tmp-policy-fixture");
    try {
      mkdirSync(join(fixture, "secret"), { recursive: true });
      writeFileSync(
        join(fixture, "secret", "page.tsx"),
        "export default function P() {}",
      );
      const paths = routePaths(fixture);
      expect(paths).toEqual([{ path: "/secret", kind: "page" }]);
      expect(policyFor("/secret")).toBeUndefined();
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("longest-prefix wins: /api/auth/me is authed, /api/auth/* is public", () => {
    expect(policyFor("/api/auth/me")?.roles).toBe("any");
    expect(policyFor("/api/auth/session")?.roles).toBe("public");
  });

  it("no duplicate patterns", () => {
    const patterns = ROUTE_POLICY.map((p) => p.pattern);
    expect(new Set(patterns).size).toBe(patterns.length);
  });
});
