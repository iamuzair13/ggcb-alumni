import { defineConfig, devices } from "@playwright/test";

/**
 * Dev-server e2e suite. For the production-build suite see
 * playwright.prod.config.ts (`pnpm test:e2e:prod`).
 */
export default defineConfig({
  testDir: "./src/tests/e2e",
  testIgnore: ["**/prod/**"],
  globalSetup: "./src/tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev --port 3100",
    url: "http://localhost:3100/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
