import { expect, test } from "@playwright/test";

test.describe("production build", () => {
  test("/design is unreachable in production", async ({ page }) => {
    const response = await page.goto("/design");
    expect(response?.status()).toBe(404);
  });

  test("security headers on / in production", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["x-powered-by"]).toBeUndefined();
    const csp = headers["content-security-policy"] ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    // Production CSP never allows eval.
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  test("/api/health stays healthy in production", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
