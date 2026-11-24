import { afterAll, describe, expect, it, vi } from "vitest";
import { createDbClient } from "@/server/db/connection";
import { getQueryStats, recordQuery, trackQueries } from "@/server/db/stats";
import { closeTestConns, appDatabaseUrl, hasTestDb } from "./helpers";

describe.skipIf(!hasTestDb)("db client (real postgres)", () => {
  afterAll(() => closeTestConns());

  it("runs with prepare: false — no server-side prepared statements", async () => {
    const sql = createDbClient(appDatabaseUrl());
    try {
      await sql`SELECT 1 AS a`;
      await sql`SELECT 2 AS b`;
      const prepared = await sql<{ n: string }[]>`
        SELECT count(*)::text AS n FROM pg_prepared_statements
      `;
      expect(prepared[0].n).toBe("0");
    } finally {
      await sql.end();
    }
  });

  it("withTransaction commits on success and rolls back on throw", async () => {
    const sql = createDbClient(appDatabaseUrl());
    try {
      await sql.begin(async (tx) => {
        await tx`INSERT INTO departments (name, code) VALUES ('Tx Commit Dept', 'TXC')`;
      });
      const rows = await sql`SELECT id FROM departments WHERE code = 'TXC'`;
      expect(rows.length).toBe(1);

      await expect(
        sql.begin(async (tx) => {
          await tx`INSERT INTO departments (name, code) VALUES ('Tx Roll Dept', 'TXR')`;
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
      const rolled = await sql`SELECT id FROM departments WHERE code = 'TXR'`;
      expect(rolled.length).toBe(0);
    } finally {
      await sql.end();
    }
  });

  it("the query counter counts when enabled and is inert when disabled", async () => {
    const sql = createDbClient(appDatabaseUrl(), {
      debug: (_c, q) => recordQuery(String(q)),
    });
    try {
      // counter enabled → trackQueries captures the two statements
      vi.stubEnv("DB_QUERY_STATS", "true");
      vi.stubEnv("NODE_ENV", "test");
      const counted = await trackQueries(async () => {
        await sql`SELECT 1`;
        await sql`SELECT 2`;
      });
      expect(counted.count).toBe(2);
      expect(getQueryStats().count).toBe(0); // outside the context: nothing

      // disabled → pass-through, no counting
      vi.stubEnv("DB_QUERY_STATS", "false");
      const off = await trackQueries(() => sql`SELECT 3`);
      expect(off.count).toBe(0);
      expect(off.queries).toEqual([]);
    } finally {
      vi.unstubAllEnvs();
      await sql.end();
    }
  });
});
