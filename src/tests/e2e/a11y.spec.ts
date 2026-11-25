import { expect, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

const pages = [
  "/design",
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email?token=x",
  "/reset-password?token=x",
  "/design/screens/account",
  "/design/screens/users",
  "/design/screens/departments",
  "/design/screens/admin-dashboard",
  "/design/screens/admin-alumni",
  "/dashboard",
  "/admin",
  // Phase 6 — real pages + the whole clickable prototype (dev-only)
  "/privacy",
  "/design/demo",
  "/design/demo/public/register",
  "/design/demo/public/check-email",
  "/design/demo/public/verify",
  "/design/demo/alumni/dashboard",
  "/design/demo/alumni/profile",
  "/design/demo/alumni/requests",
  "/design/demo/alumni/e-card",
  "/design/demo/alumni/events",
  "/design/demo/alumni/announcements",
  "/design/demo/alumni/opportunities",
  "/design/demo/alumni/stories",
  "/design/demo/alumni/account",
  "/design/demo/admin?persona=admin",
  "/design/demo/admin/alumni?persona=admin",
  "/design/demo/admin/departments?persona=admin",
  "/design/demo/admin/content?persona=admin",
  "/design/demo/admin/import-export?persona=admin",
  "/design/demo/admin/analytics?persona=admin",
  "/design/demo/admin/audit-logs?persona=admin",
  "/design/demo/admin/users?persona=superadmin",
  "/design/demo/admin/alumni?persona=viewer",
];

for (const path of pages) {
  test(`axe scan: ${path} has no serious/critical violations`, async ({
    page,
  }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(
      blocking,
      blocking
        .map(
          (v) =>
            `${v.id} (${v.impact}): ${v.help} — ${v.nodes
              .map((n) => n.target.join(" "))
              .join(", ")}`,
        )
        .join("\n"),
    ).toHaveLength(0);
  });
}
