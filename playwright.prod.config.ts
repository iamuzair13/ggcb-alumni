import { defineConfig, devices } from "@playwright/test";

/**
 * Production-build e2e suite. Run with `pnpm test:e2e:prod` — it builds the
 * app and serves it with `next start`. Only tests under e2e/prod/ run here;
 * they verify behaviours that must hold for the production bundle (e.g. the
 * dev-only /design route returning 404).
 */
export default defineConfig({
  testDir: "./src/tests/e2e/prod",
  globalSetup: "./src/tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3101",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm start --port 3101",
    url: "http://localhost:3101/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { SKIP_ENV_VALIDATION: "true" },
  },
});
