import { expect, test } from "@playwright/test";
import {
  E2E_EMAILS,
  E2E_PASSWORD,
  hasE2eAuthDb,
  provisionE2ePersonas,
} from "./helpers/personas";

/**
 * Cron endpoint (spec §4.7): 401 for every persona (session never
 * authorizes), 401 for a wrong bearer, 200 only with the right secret.
 * The 200 case needs CRON_SECRET set on the server under test — provided
 * in CI; skipped locally otherwise.
 */
const CRON = "/api/cron/email-outbox";

test.describe("cron route is fail-closed", () => {
  test("anonymous → 401", async ({ request }) => {
    const res = await request.get(CRON);
    expect(res.status()).toBe(401);
  });

  test("wrong bearer → 401", async ({ request }) => {
    const res = await request.get(CRON, {
      headers: { authorization: "Bearer not-the-secret" },
    });
    expect(res.status()).toBe(401);
  });

  test("malformed authorization headers → 401", async ({ request }) => {
    for (const h of ["Bearer", "Bearer ", "Basic abc", "bearer x"]) {
      const res = await request.get(CRON, { headers: { authorization: h } });
      expect(res.status(), h).toBe(401);
    }
  });
});

test.describe("cron route with personas (requires test DB)", () => {
  test.skip(!hasE2eAuthDb, "E2E_AUTH=1 + local *test* DB required");
  test.beforeAll(() => provisionE2ePersonas());

  async function signIn(page: import("@playwright/test").Page, email: string) {
    await page.goto("/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 30_000,
    });
  }

  test("no role authorizes it — every persona gets 401", async ({ page }) => {
    for (const email of [
      E2E_EMAILS.superadmin,
      E2E_EMAILS.admin,
      E2E_EMAILS.viewer,
      E2E_EMAILS.alumniVerified,
    ]) {
      await page.context().clearCookies();
      await signIn(page, email);
      const res = await page.request.get(CRON);
      expect(res.status(), email).toBe(401);
    }
  });

  test("correct bearer returns counts only (no payload data)", async ({
    request,
  }) => {
    const secret = process.env.CRON_SECRET;
    test.skip(!secret, "CRON_SECRET not set on the test server");
    const res = await request.get(CRON, {
      headers: { authorization: `Bearer ${secret}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.outbox).toMatchObject({
      claimed: expect.any(Number),
      sent: expect.any(Number),
    });
    const text = await res.text();
    for (const bad of ["payload", "token", "password", "subject"]) {
      expect(text.toLowerCase()).not.toContain(bad);
    }
  });
});
