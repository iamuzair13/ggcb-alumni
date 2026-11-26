import { expect, test } from "@playwright/test";

/**
 * Token/account pages (Phase 5). The critical invariant tested here: a GET
 * renders a confirm/action form and NEVER consumes a token — no network
 * POST happens without a user gesture.
 */
const tokenPages = [
  {
    path: "/verify-email?token=dummy-token-for-testing",
    confirm: /confirm my email/i,
  },
  {
    path: "/reset-password?token=dummy-token-for-testing",
    confirm: /save password/i,
  },
  {
    path: "/set-password?token=dummy-token-for-testing",
    confirm: /save password/i,
  },
] as const;

test.describe("token pages — GET never consumes", () => {
  for (const { path, confirm } of tokenPages) {
    test(`${path} renders a form, sends no mutating request, and strips the token`, async ({
      page,
    }) => {
      const posts: string[] = [];
      page.on("request", (req) => {
        if (req.method() === "POST") posts.push(req.url());
      });
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      // no-store + no-referrer headers on token pages
      expect(response?.headers()["cache-control"]).toContain("no-store");
      expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
      await page.waitForLoadState("networkidle");
      // A confirm/save action exists but nothing POSTed just by loading.
      await expect(page.getByRole("button", { name: confirm })).toBeVisible();
      expect(posts, `GET ${path} sent POSTs: ${posts.join(", ")}`).toHaveLength(
        0,
      );
      // The raw token is removed from the visible URL after mount.
      await expect(page).not.toHaveURL(/token=/);
    });
  }

  test("/verify-email with NO token shows the generic invalid link state", async ({
    page,
  }) => {
    await page.goto("/verify-email");
    await expect(
      page.getByRole("heading", { name: /link invalid or expired/i }),
    ).toBeVisible();
  });

  test("/forgot-password always shows the neutral confirmation", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await page.getByLabel(/email/i).fill("nobody@example.invalid");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByText(/if an account exists/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
