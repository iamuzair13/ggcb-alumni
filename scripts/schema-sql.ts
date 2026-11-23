/**
 * db:schema — regenerate docs/ops/schema-bootstrap.sql (one-time Supabase
 * bootstrap). Reads migrations/ verbatim and embeds the runner's
 * EOL-normalised checksums into pre-populated applied_migrations rows, so
 * the output can never drift from the migration files or the ledger
 * contract. CI fails when the committed file drifts (`pnpm db:schema` +
 * `git diff --exit-code`).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listMigrationFiles } from "./lib/runner";

const OUT = join(process.cwd(), "docs", "ops", "schema-bootstrap.sql");

function main() {
  const files = listMigrationFiles();
  const lines: string[] = [
    "-- ============================================================================",
    "-- docs/ops/schema-bootstrap.sql — GENERATED point-in-time artifact.",
    "-- DO NOT EDIT BY HAND. Regenerate with:  pnpm db:schema",
    "--",
    "-- Equivalent to running the migrations below through `pnpm db:migrate`,",
    "-- assembled as a single file for the Supabase SQL editor. It reflects",
    "-- the migrations as of generation time — always prefer the runner when",
    "-- it is available.",
    "-- The applied_migrations ledger is pre-populated with the runner's",
    "-- EOL-normalised checksums, so the runner stays the source of truth:",
    "-- future changes go through `pnpm db:new` + `pnpm db:migrate`, never by",
    "-- editing this file.",
    "-- ============================================================================",
    "",
    "BEGIN;",
    "",
    "SET LOCAL search_path = public, extensions;",
    "",
    "-- Runner ledger (the migration runner would bootstrap this itself).",
    "",
    "CREATE TABLE IF NOT EXISTS applied_migrations (",
    "  id           integer PRIMARY KEY,",
    "  name         text NOT NULL UNIQUE,",
    "  checksum     text NOT NULL,",
    "  applied_at   timestamptz NOT NULL DEFAULT now(),",
    "  execution_ms integer",
    ");",
    "",
  ];
  for (const f of files) {
    lines.push(
      "",
      `-- ################## ${f.name} ##################`,
      "",
      readFileSync(f.path, "utf8").replace(/\r\n/g, "\n").trimEnd(),
    );
  }
  lines.push(
    "",
    "-- Ledger rows for the migrations above (sha256, EOL-normalised — the",
    "-- same values `pnpm db:migrate` records).",
    "",
    "INSERT INTO applied_migrations (id, name, checksum, execution_ms) VALUES",
    files
      .map(
        (f, i) =>
          `  (${f.id}, '${f.name}', '${f.checksum}', 0)` +
          (i === files.length - 1 ? ";" : ","),
      )
      .join("\n"),
    "",
    "COMMIT;",
    "",
  );
  writeFileSync(OUT, lines.join("\n"));
  console.log(
    `[db:schema] wrote docs/ops/schema-bootstrap.sql (${files.length} migrations embedded)`,
  );
}

main();
