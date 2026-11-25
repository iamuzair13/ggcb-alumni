import { expect, test } from "@playwright/test";

/**
 * Dev-only surface guard — every /design/demo route must 404 in a
 * production build (playwright.prod.config.ts runs this spec against
 * `next start`). In dev these routes render the prototype.
 */
const demoRoutes = [
  "/design/demo",
  "/design/demo/public/register",
  "/design/demo/alumni/dashboard",
  "/design/demo/admin/alumni",
  "/design/demo/admin/import-export",
];

for (const route of demoRoutes) {
  test(`${route} → 404 in production`, async ({ page }) => {
    const res = await page.goto(route);
    expect(res?.status()).toBe(404);
  });
}
