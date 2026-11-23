/**
 * Migration runner core — forward-only, checksummed, ledger'd.
 * See docs/db/migrations.md for the full contract.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

export const MIGRATIONS_DIR = join(process.cwd(), "migrations");
export const ADVISORY_LOCK_KEY = 20261123;

export interface MigrationFile {
  id: number;
  name: string;
  path: string;
  checksum: string;
}

export interface AppliedMigration {
  id: number;
  name: string;
  checksum: string;
  applied_at: Date;
  execution_ms: number | null;
}

export function checksum(contents: string): string {
  // Normalise EOL first — checksums must be identical whether git checks the
  // file out as LF (CI/Supabase) or CRLF (Windows autocrlf).
  return createHash("sha256")
    .update(contents.replace(/\r\n/g, "\n"), "utf8")
    .digest("hex");
}

/** List on-disk migrations; fails loudly on gaps, duplicates, bad names. */
export function listMigrationFiles(
  dir: string = MIGRATIONS_DIR,
): MigrationFile[] {
  const names = readdirSync(dir).filter((f) => f.endsWith(".sql"));
  const files: MigrationFile[] = names.map((name) => {
    const match = /^(\d{4})_([a-z0-9_]+)\.sql$/.exec(name);
    if (!match) {
      throw new Error(
        `Bad migration filename "${name}" — expected NNNN_snake_name.sql`,
      );
    }
    const path = join(dir, name);
    return {
      id: Number(match[1]),
      name,
      path,
      checksum: checksum(readFileSync(path, "utf8")),
    };
  });
  files.sort((a, b) => a.id - b.id);
  files.forEach((file, index) => {
    if (file.id !== index + 1) {
      throw new Error(
        `Migration numbering must be contiguous from 0001 — ` +
          `expected ${String(index + 1).padStart(4, "0")}, found ${file.name}`,
      );
    }
  });
  return files;
}

const CREATE_LEDGER = `
  CREATE TABLE IF NOT EXISTS applied_migrations (
    id           integer PRIMARY KEY,
    name         text NOT NULL UNIQUE,
    checksum     text NOT NULL,
    applied_at   timestamptz NOT NULL DEFAULT now(),
    execution_ms integer
  )
`;

/** Runner holds the advisory lock for the whole apply pass. */
export async function runMigrations(
  sql: postgres.Sql,
  dir: string = MIGRATIONS_DIR,
): Promise<{ applied: string[]; alreadyApplied: number }> {
  await sql.unsafe(CREATE_LEDGER);

  // Serialize concurrent runners — second runner blocks until the first
  // releases at connection end / explicit unlock.
  await sql`SELECT pg_advisory_lock(${ADVISORY_LOCK_KEY})`;
  try {
    const files = listMigrationFiles(dir);
    const appliedRows = await sql<AppliedMigration[]>`
      SELECT id, name, checksum, applied_at, execution_ms
      FROM applied_migrations ORDER BY id
    `;

    const appliedById = new Map(appliedRows.map((r) => [r.id, r]));
    for (const row of appliedRows) {
      const file = files.find((f) => f.id === row.id);
      if (!file) {
        throw new Error(
          `Ledger row ${row.id} ("${row.name}") has no matching file — ` +
            "never delete applied migrations; fix forward.",
        );
      }
      if (file.name !== row.name || file.checksum !== row.checksum) {
        throw new Error(
          `Migration ${row.name} changed after being applied ` +
            "(checksum mismatch). Never edit applied migrations; add a new one.",
        );
      }
    }
    const pending = files.filter((f) => !appliedById.has(f.id));

    const applied: string[] = [];
    for (const file of pending) {
      const contents = readFileSync(file.path, "utf8");
      const started = Date.now();
      await sql.begin(async (tx) => {
        await tx.unsafe(`SET LOCAL search_path = public, extensions`);
        await tx.unsafe(contents);
        await tx`
          INSERT INTO applied_migrations (id, name, checksum, execution_ms)
          VALUES (${file.id}, ${file.name}, ${file.checksum}, ${Date.now() - started})
        `;
      });
      applied.push(file.name);
    }
    return { applied, alreadyApplied: appliedRows.length };
  } finally {
    await sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`.catch(() => {});
  }
}

export async function migrationStatus(
  sql: postgres.Sql,
  dir: string = MIGRATIONS_DIR,
): Promise<{ applied: AppliedMigration[]; pending: MigrationFile[] }> {
  await sql.unsafe(CREATE_LEDGER);
  const files = listMigrationFiles(dir);
  const applied = await sql<AppliedMigration[]>`
    SELECT id, name, checksum, applied_at, execution_ms
    FROM applied_migrations ORDER BY id
  `;
  const appliedIds = new Set(applied.map((r) => r.id));
  return { applied, pending: files.filter((f) => !appliedIds.has(f.id)) };
}

export function scriptSql(url: string): postgres.Sql {
  return postgres(url, { max: 1, prepare: false, onnotice: () => {} });
}
