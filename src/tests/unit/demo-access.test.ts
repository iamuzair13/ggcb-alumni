/**
 * Parity test — the demo's role rules must equal ROUTE_POLICY for every
 * route it mirrors. If the policy changes, this test fails until the demo
 * table is updated too.
 */
import { describe, expect, it } from "vitest";
import {
  ADMIN_DEMO_ROUTES,
  adminRouteAllowed,
  alumniRouteAllowed,
  DEMO_PERSONAS,
  type DemoPersona,
} from "@/features/_shared/personas";
import { policyFor } from "@/server/auth/route-policy";

const persona = (id: string): DemoPersona =>
  DEMO_PERSONAS.find((p) => p.id === id)!;

describe("demo access rules mirror ROUTE_POLICY", () => {
  it("every admin demo route has a matching policy entry with equal roles", () => {
    for (const route of ADMIN_DEMO_ROUTES) {
      const policy = policyFor(route.path);
      expect(policy, `no policy for ${route.path}`).toBeTruthy();
      expect(policy!.roles).not.toBe("public");
      expect([...route.roles].sort()).toEqual(
        [...(policy!.roles as string[])].sort(),
      );
    }
  });

  it("viewer sees exactly the five operational sections", () => {
    const v = persona("viewer");
    const allowed = ADMIN_DEMO_ROUTES.filter((r) =>
      adminRouteAllowed(v, r.path),
    ).map((r) => r.path);
    expect(allowed.sort()).toEqual([
      "/admin",
      "/admin/alumni",
      "/admin/analytics",
      "/admin/content",
      "/admin/departments",
    ]);
    expect(adminRouteAllowed(v, "/admin/users")).toBe(false);
    expect(adminRouteAllowed(v, "/admin/import-export")).toBe(false);
    expect(adminRouteAllowed(v, "/admin/audit-logs")).toBe(false);
  });

  it("admin sees seven sections; only superadmin sees users", () => {
    const admin = persona("admin");
    expect(adminRouteAllowed(admin, "/admin/import-export")).toBe(true);
    expect(adminRouteAllowed(admin, "/admin/audit-logs")).toBe(true);
    expect(adminRouteAllowed(admin, "/admin/users")).toBe(false);
    expect(adminRouteAllowed(persona("superadmin"), "/admin/users")).toBe(true);
  });

  it("under-approval and rejected alumni reach only dashboard + account", () => {
    for (const id of ["alumni-pending", "alumni-rejected"]) {
      const p = persona(id);
      expect(alumniRouteAllowed(p, "/alumni/dashboard")).toBe(true);
      expect(alumniRouteAllowed(p, "/alumni/account")).toBe(true);
      for (const path of [
        "/alumni/profile",
        "/alumni/e-card",
        "/alumni/events",
        "/alumni/stories",
        "/alumni/opportunities",
        "/alumni/announcements",
      ]) {
        expect(alumniRouteAllowed(p, path), `${id} blocked from ${path}`).toBe(
          false,
        );
      }
    }
    const v = persona("alumni-verified");
    for (const path of [
      "/alumni/profile",
      "/alumni/e-card",
      "/alumni/events",
      "/alumni/stories",
    ]) {
      expect(alumniRouteAllowed(v, path)).toBe(true);
    }
  });

  it("staff personas cannot open alumni routes and vice versa", () => {
    expect(alumniRouteAllowed(persona("admin"), "/alumni/dashboard")).toBe(
      false,
    );
    expect(adminRouteAllowed(persona("alumni-verified"), "/admin")).toBe(false);
    expect(adminRouteAllowed(persona("anonymous"), "/admin")).toBe(false);
  });
});
