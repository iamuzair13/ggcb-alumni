import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      // `server-only` throws outside the RSC bundler — stub it in tests.
      "server-only": new URL(
        "./src/tests/unit/stubs/server-only.ts",
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/unit/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "src/tests/unit/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "src/tests/e2e/**", "src/tests/db/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
