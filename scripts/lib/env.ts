/**
 * Minimal env loading for standalone scripts (scripts run outside Next.js —
 * no automatic .env.local loading, and importing src/lib/config/env.server
 * is impossible because it carries `server-only`).
 *
 * Deliberately tiny: KEY=VALUE lines, optional quotes, `#` comments.
 * Existing process.env values are never overridden.
 */
import { existsSync, readFileSync } from "node:fs";

const ENV_FILES = [".env.local", ".env", ".env.test.local", ".env.test"];

export function loadEnvFiles(cwd: string = process.cwd()): void {
  for (const file of ENV_FILES) {
    const path = `${cwd}/${file}`;
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}
