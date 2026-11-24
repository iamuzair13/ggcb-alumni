import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 360, height: 740 } });

const pages = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/dashboard",
  "/admin",
  "/admin/alumni",
  "/design",
];

for (const path of pages) {
  test(`360px: no horizontal page scroll on ${path}`, async ({ page }) => {
    await page.goto(path);
    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
}
