import { expect, test } from "@playwright/test";

const publicRoutes = [
  { path: "/", heading: /alumni record/i },
  { path: "/login", heading: /sign in/i },
  { path: "/register", heading: /register as alumni/i },
  { path: "/forgot-password", heading: /reset your password/i },
] as const;

const protectedRoutes = [
  "/dashboard",
  "/admin",
  "/admin/alumni",
  "/admin/departments",
  "/admin/content",
  "/admin/import-export",
  "/admin/analytics",
  "/admin/users",
  "/admin/audit-logs",
] as const;

test.describe("public shell routes", () => {
  for (const { path, heading } of publicRoutes) {
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
});

test.describe("protected shell routes (anonymous)", () => {
  for (const path of protectedRoutes) {
    test(`${path} redirects an anonymous user to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?callbackUrl=/);
    });
  }

  test("callbackUrl is a safe same-origin path, never an open redirect", async ({
    page,
  }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/callbackUrl=%2Fadmin%2Fusers/);
    // Even a crafted callbackUrl stays on-site.
    await page.goto("/login?callbackUrl=https%3A%2F%2Fevil.example");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});
