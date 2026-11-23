import { Linter } from "eslint";
import { describe, expect, it } from "vitest";

import { noServerImportsInClient } from "../../../eslint-rules/no-server-imports-in-client.mjs";

/**
 * Proves the client→server import guard actually fires, without needing a
 * committed violation in the tree.
 */
const linter = new Linter({ configType: "flat" });
const config = {
  plugins: {
    ggcb: { rules: { "no-server-imports-in-client": noServerImportsInClient } },
  },
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
  rules: { "ggcb/no-server-imports-in-client": "error" },
} as unknown as Linter.Config;

function lint(code: string) {
  return linter.verify(code, config);
}

describe("no-server-imports-in-client", () => {
  it("flags a static import in a client module", () => {
    const messages = lint(
      `"use client";\nimport { db } from "@/server/db";\nexport const x = db;`,
    );
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain("@/server/db");
  });

  it("flags relative and dynamic server imports too", () => {
    expect(
      lint(`"use client";\nimport x from "../../server/db";`),
    ).toHaveLength(1);
    expect(
      lint(`"use client";\nconst p = import("@/server/services");`),
    ).toHaveLength(1);
  });

  it("flags re-exports of server modules", () => {
    expect(
      lint(`"use client";\nexport { db } from "@/server/db";`),
    ).toHaveLength(1);
  });

  it("allows the same import without the client directive", () => {
    const messages = lint(`import { db } from "@/server/db";`);
    expect(messages).toHaveLength(0);
  });

  it("allows normal imports in client modules", () => {
    const messages = lint(
      `"use client";\nimport { useState } from "react";\nimport { cn } from "@/lib/utils";`,
    );
    expect(messages).toHaveLength(0);
  });
});
