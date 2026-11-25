import { expect, test } from "@playwright/test";

test.describe("/api/health", () => {
  test("returns the liveness payload and is never cached", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  test("leaks no environment or version details", async ({ request }) => {
    const response = await request.get("/api/health");
    const body = await response.text();
    expect(body).not.toMatch(/version|env|database|supabase|secret/i);
    expect(response.headers()["x-powered-by"]).toBeUndefined();
  });
});
