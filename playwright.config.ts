import { defineConfig, devices } from "@playwright/test";

/**
 * Dev-server e2e suite. For the production-build suite see
 * playwright.prod.config.ts (`pnpm test:e2e:prod`).
 *
 * E2E_BASE_URL lets a local run reuse an already-running dev server
 * (Next 16 allows only ONE `next dev` per project directory):
 *   $env:E2E_BASE_URL="http://localhost:3000"; pnpm test:e2e
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

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
    baseURL,
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
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
