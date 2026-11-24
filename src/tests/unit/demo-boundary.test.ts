/**
 * Import-boundary guard — no client module may import fixture world data.
 * Fixture strings must never reach a production client chunk; this grep
 * test catches accidental imports before the bundle check does.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(tsx?|jsx?)$/.test(name)) yield p;
  }
}

/**
 * Client-safe adapter factories under `fixtures/adapter` are allowed —
 * they contain no data, only logic, and take the world slice via args.
 * What must never cross into client chunks is the DATA (world + index
 * barrels that import it).
 */
const FORBIDDEN = [
  /_shared\/fixtures\/(world|engine)/,
  /features\/[^"']*\/fixtures\/index/,
  /features\/[^"']*\/fixtures['"]/,
];

describe("client files never import fixture data", () => {
  it("no 'use client' file imports _shared/fixtures/world or fixture indexes", () => {
    const offenders: string[] = [];
    for (const file of walk("src")) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      const text = readFileSync(file, "utf8");
      const isClient =
        text.includes('"use client"') || text.includes("'use client'");
      if (!isClient) continue;
      for (const pat of FORBIDDEN) {
        const imports = text
          .split("\n")
          .filter((l) => l.includes("import") || l.includes("from"));
        for (const line of imports) {
          if (pat.test(line)) {
            offenders.push(`${file}: ${line.trim()}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
