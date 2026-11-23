import { afterAll, describe, expect, it } from "vitest";
import { DB_ENUMS } from "@/server/db/enums";
import { closeTestConns, getDirectSql, hasTestDb } from "./helpers";

describe.skipIf(!hasTestDb)("enum drift (real postgres)", () => {
  afterAll(() => closeTestConns());

  it("TypeScript constants equal pg_enum values for every enum", async () => {
    const sql = getDirectSql();
    const rows = await sql<{ typname: string; enumlabel: string }[]>`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `;
    const actual = new Map<string, string[]>();
    for (const r of rows) {
      (actual.get(r.typname) ?? actual.set(r.typname, []).get(r.typname)!).push(
        r.enumlabel,
      );
    }
    // exactly the enums the schema defines — no more, no less
    expect([...actual.keys()].sort()).toEqual(Object.keys(DB_ENUMS).sort());
    for (const [name, values] of Object.entries(DB_ENUMS)) {
      expect(actual.get(name), `enum ${name}`).toEqual([...values]);
    }
  });
});
