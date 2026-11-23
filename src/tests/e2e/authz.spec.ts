import { expect, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import {
  E2E_EMAILS,
  E2E_PASSWORD,
  hasE2eAuthDb,
  provisionE2ePersonas,
} from "./helpers/personas";
import { ROUTE_POLICY } from "@/server/auth/route-policy";

/**
 * Login + authz matrix e2e.
 *
 * The anonymous/login-UI cases run everywhere. The persona matrix requires
 * E2E_AUTH=1 + TEST_DIRECT_URL on a local *test* database (personas are
 * written directly by provisionE2ePersonas) AND the webserver's
 * DATABASE_URL pointing at that same database — CI provides both.
 */

test("axe scan: /login has no serious/critical violations", async ({
  page,
}) => {
  await page.goto("/login");
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(blocking).toHaveLength(0);
});

test("login page is accessible and password-manager friendly", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByLabel(/^email/i)).toBeVisible();
  const pwd = page.getByLabel(/^password/i);
  await expect(pwd).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();
  const email = page.locator('input[name="email"]');
  expect(await email.getAttribute("autocomplete")).toBe("username");
  expect(await pwd.getAttribute("autocomplete")).toBe("current-password");
  // Show/hide toggle is properly labelled.
  await expect(
    page.getByRole("button", { name: /show password/i }),
  ).toBeVisible();
});

test("anonymous user is redirected from protected pages to /login", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fadmin/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("public routes respond 200 for anonymous users", async ({ page }) => {
  for (const p of ["/", "/login", "/register", "/forgot-password"]) {
    const res = await page.request.get(p);
    expect(res.status()).toBe(200);
  }
});

test("GET /api/auth/me → 401 JSON for anonymous", async ({ request }) => {
  const res = await request.get("/api/auth/me");
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  // Deep-scan: no sensitive keys in auth responses.
  const text = await res.text();
  for (const bad of ["password", "hash", "token_hash", "$argon2"]) {
    expect(text.toLowerCase()).not.toContain(bad);
  }
});

test.describe("persona matrix (requires local test DB)", () => {
  test.skip(!hasE2eAuthDb, "E2E_AUTH=1 + local *test* DB required");

  test.beforeAll(async () => {
    await provisionE2ePersonas();
  });

  async function signIn(page: import("@playwright/test").Page, email: string) {
    await page.goto("/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 30_000,
    });
  }

  test("each persona lands on its role home after login", async ({ page }) => {
    const cases: [string, RegExp][] = [
      [E2E_EMAILS.superadmin, /\/admin/],
      [E2E_EMAILS.admin, /\/admin/],
      [E2E_EMAILS.viewer, /\/admin/],
      [E2E_EMAILS.alumniVerified, /\/dashboard/],
    ];
    for (const [email, dest] of cases) {
      await signIn(page, email);
      await expect(page).toHaveURL(dest);
      await page.goto("/"); // fresh navigation for next sign-in
      await page.context().clearCookies();
    }
  });

  test("route policy matrix — every route behaves per policy for every persona", async ({
    page,
  }) => {
    const personas: { email: string | null; role: string | null }[] = [
      { email: null, role: null },
      { email: E2E_EMAILS.superadmin, role: "superadmin" },
      { email: E2E_EMAILS.admin, role: "admin" },
      { email: E2E_EMAILS.viewer, role: "viewer" },
      { email: E2E_EMAILS.alumniVerified, role: "alumni" },
      { email: E2E_EMAILS.alumniPending, role: "alumni" },
    ];
    const pageRoutes = ROUTE_POLICY.filter(
      (p) => p.kind === "page" && !p.devOnly,
    );
    for (const persona of personas) {
      await page.context().clearCookies();
      if (persona.email) await signIn(page, persona.email);
      for (const entry of pageRoutes) {
        if (entry.guestOnly && persona.email) {
          // Signed-in users are bounced off guest pages to role home.
          await page.goto(entry.pattern);
          const home = persona.role === "alumni" ? "/dashboard" : "/admin";
          expect(page.url()).toContain(home);
          continue;
        }
        if (entry.roles === "public") {
          const res = await page.request.get(
            entry.pattern === "/" ? "/" : entry.pattern,
          );
          expect(res.status()).toBe(200);
          continue;
        }
        await page.goto(entry.pattern);
        const url = page.url();
        if (!persona.email) {
          expect(url).toContain("/login");
        } else if (
          entry.roles !== "any" &&
          !(entry.roles as readonly string[]).includes(persona.role!)
        ) {
          // Wrong role → explicit 403 page.
          await expect(page.getByText("403")).toBeVisible();
        }
      }
    }
  });

  test("signed-in user is redirected away from /login to role home", async ({
    page,
  }) => {
    await signIn(page, E2E_EMAILS.admin);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/admin/);
  });

  test("authenticated pages carry private, no-store and never cross-user cached content", async ({
    page,
  }) => {
    await signIn(page, E2E_EMAILS.viewer);
    const res = await page.goto("/admin");
    const cc = res?.headers()["cache-control"] ?? "";
    expect(cc).toContain("private");
    expect(cc).toContain("no-store");
    await expect(page.getByText("E2E Viewer")).toBeVisible();
    await page.context().clearCookies();
    await signIn(page, E2E_EMAILS.admin);
    await page.goto("/admin");
    await expect(page.getByText("E2E Admin")).toBeVisible();
    await expect(page.getByText("E2E Viewer")).not.toBeVisible();
  });

  test("viewer gets 403 on /admin/users (explicit Forbidden, not 404)", async ({
    page,
  }) => {
    await signIn(page, E2E_EMAILS.viewer);
    const res = await page.goto("/admin/users");
    expect(res?.status()).toBe(403);
    await expect(page.getByText(/don't have access/i)).toBeVisible();
  });

  test("pending alumni sees the status view on /dashboard", async ({
    page,
  }) => {
    await signIn(page, E2E_EMAILS.alumniPending);
    await page.goto("/dashboard");
    await expect(page.getByText(/under review/i)).toBeVisible();
  });

  test("role-aware sidebar — superadmin sees all eight, viewer sees five", async ({
    page,
  }) => {
    const all = [
      "Dashboard",
      "Alumni",
      "Departments",
      "Content",
      "Import/Export",
      "Analytics",
      "Users",
      "Audit Logs",
    ] as const;
    const viewerVisible = [
      "Dashboard",
      "Alumni",
      "Departments",
      "Content",
      "Analytics",
    ];
    const superOnly = ["Import/Export", "Users", "Audit Logs"];

    await signIn(page, E2E_EMAILS.superadmin);
    await page.goto("/admin");
    const nav = page
      .getByRole("navigation", { name: "Admin sections" })
      .first();
    for (const name of all) {
      await expect(nav.getByRole("link", { name })).toBeVisible();
    }
    await page.context().clearCookies();

    await signIn(page, E2E_EMAILS.viewer);
    await page.goto("/admin");
    for (const name of viewerVisible) {
      await expect(nav.getByRole("link", { name })).toBeVisible();
    }
    for (const name of superOnly) {
      await expect(nav.getByRole("link", { name })).not.toBeVisible();
    }
  });
});
