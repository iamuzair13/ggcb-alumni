import { expect, test } from "@playwright/test";

const shellRoutes = [
  { path: "/", heading: /Government Postgraduate College Burewala/i },
  { path: "/login", heading: /sign in/i },
  { path: "/register", heading: /register as alumni/i },
  { path: "/forgot-password", heading: /reset your password/i },
  { path: "/dashboard", heading: /alumni dashboard/i },
  { path: "/admin", heading: /^dashboard$/i },
  { path: "/admin/alumni", heading: /^alumni$/i },
  { path: "/admin/departments", heading: /^departments$/i },
  { path: "/admin/content", heading: /^content$/i },
  { path: "/admin/import-export", heading: /^import\/export$/i },
  { path: "/admin/analytics", heading: /^analytics$/i },
  { path: "/admin/users", heading: /^users$/i },
  { path: "/admin/audit-logs", heading: /^audit logs$/i },
] as const;

test.describe("shell routes", () => {
  for (const { path, heading } of shellRoutes) {
    test(`${path} returns 200 and renders its heading`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: heading }).first(),
      ).toBeVisible();
    });
  }

  test("/design renders in development", async ({ page }) => {
    const response = await page.goto("/design");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: /design system/i }),
    ).toBeVisible();
  });

  test("admin sidebar lists all eight sections", async ({ page }) => {
    await page.goto("/admin");
    const nav = page
      .getByRole("navigation", { name: "Admin sections" })
      .first();
    await expect(nav).toBeVisible();
    for (const name of [
      "Dashboard",
      "Alumni",
      "Departments",
      "Content",
      "Import/Export",
      "Analytics",
      "Users",
      "Audit Logs",
    ]) {
      await expect(nav.getByRole("link", { name })).toBeVisible();
    }
  });
});
