import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { listMigrationFiles, MIGRATIONS_DIR } from "./lib/runner";

const TEMPLATE = `-- %NAME%
-- <describe the change>
--
-- SECURITY BOILERPLATE — every new public table needs all of:
--   ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
--   GRANT <least-privilege commands> ON <table> TO ggcb_app;
--   one CREATE POLICY ggcb_app_<cmd> per granted command:
--     CREATE POLICY ggcb_app_select ON <table> FOR SELECT TO ggcb_app USING (true);
--     CREATE POLICY ggcb_app_insert ON <table> FOR INSERT TO ggcb_app WITH CHECK (true);
--     CREATE POLICY ggcb_app_update ON <table> FOR UPDATE TO ggcb_app USING (true) WITH CHECK (true);
--     CREATE POLICY ggcb_app_delete ON <table> FOR DELETE TO ggcb_app USING (true);
-- Run \`pnpm db:verify\` afterwards — it fails if any of this is missing.
--
-- Enum caveat: ALTER TYPE ... ADD VALUE cannot run inside this runner's
-- transaction on older Postgres — add enum values in their own migration.
`;

function main() {
  const name = process.argv[2];
  if (!name || !/^[a-z0-9_]+$/.test(name)) {
    console.error("usage: pnpm db:new <snake_name>");
    process.exit(1);
  }
  const files = listMigrationFiles();
  const next = files.length + 1;
  const filename = `${String(next).padStart(4, "0")}_${name}.sql`;
  writeFileSync(
    join(MIGRATIONS_DIR, filename),
    TEMPLATE.replace("%NAME%", filename),
  );
  console.log(`[db:new] created migrations/${filename}`);
}

main();
