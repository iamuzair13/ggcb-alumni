import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

import { noServerImportsInClient } from "./eslint-rules/no-server-imports-in-client.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    plugins: {
      ggcb: {
        rules: { "no-server-imports-in-client": noServerImportsInClient },
      },
    },
    rules: {
      "ggcb/no-server-imports-in-client": "error",
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project additions:
    "node_modules/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "public/**",
  ]),
]);

export default eslintConfig;
