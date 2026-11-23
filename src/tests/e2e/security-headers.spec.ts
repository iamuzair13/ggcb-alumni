import { expect, test } from "@playwright/test";

for (const path of ["/", "/api/health"]) {
  test(`security headers on ${path}`, async ({ request }) => {
    const response = await request.get(path);
    const headers = response.headers();

    expect(headers["x-powered-by"]).toBeUndefined();

    const csp = headers["content-security-policy"] ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");

    expect(headers["strict-transport-security"]).toContain("max-age=");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBeDefined();
    expect(headers["permissions-policy"]).toContain("camera=()");
  });
}
