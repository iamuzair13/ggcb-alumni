import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Real-PostgreSQL integration tests (src/tests/db/**). Requires:
 *   TEST_DIRECT_URL   — admin/direct connection (migrations + setup)
 *   TEST_DATABASE_URL — app-role connection (ggcb_app behaviour)
 * Both must target a LOCAL database whose name contains "test"
 * (enforced by the safety interlock + src/tests/db/helpers.ts).
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["src/tests/db/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    pool: "forks",
    testTimeout: 60_000,
    hookTimeout: 120_000,
    globalSetup: ["./src/tests/db/global-setup.ts"],
    alias: {
      "server-only": new URL(
        "./src/tests/unit/stubs/server-only.ts",
        import.meta.url,
      ).pathname,
    },
  },
});
