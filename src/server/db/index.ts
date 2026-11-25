import "server-only";
/**
 * Server-only database client.
 *
 * - postgres.js singleton, cached on globalThis so dev hot-reload does not
 *   create a new pool each reload.
 * - Lazy: the connection is created on first use, not at import time.
 * - prepare: false (transaction-mode pooler); small pool via DB_POOL_MAX.
 * - withTransaction() commits on success, rolls back on any throw.
 * - Dev-only query counter (DB_QUERY_STATS) — inert in production.
 *
 * Client components cannot import this file (enforced by `server-only` +
 * the ggcb/no-server-imports-in-client ESLint rule).
 */
import type postgres from "postgres";
import { createDbClient } from "./connection";
import { getServerEnv } from "@/lib/config/env.server";
import {
  getQueryStats,
  queryStatsEnabled,
  recordQuery,
  trackQueries,
} from "./stats";

declare global {
  var __ggcbDb: postgres.Sql | undefined;
}

function getSql(): postgres.Sql {
  if (!globalThis.__ggcbDb) {
    const env = getServerEnv();
    globalThis.__ggcbDb = createDbClient(env.DATABASE_URL, {
      max: env.DB_POOL_MAX ?? 3,
      // The debug hook is installed only when the dev counter is on —
      // production pays zero overhead.
      debug: queryStatsEnabled()
        ? (_conn, query) => recordQuery(String(query))
        : undefined,
    });
  }
  return globalThis.__ggcbDb;
}

/** Tagged-template `sql` — lazily resolves the singleton on every use. */
export const sql: postgres.Sql = new Proxy(
  (() => {}) as unknown as postgres.Sql,
  {
    get(_target, prop, receiver) {
      const inner = getSql() as unknown as Record<PropertyKey, unknown>;
      const value = Reflect.get(inner, prop, receiver);
      return typeof value === "function"
        ? (value as (...a: unknown[]) => unknown).bind(inner)
        : value;
    },
    apply(_target, _thisArg, argArray: unknown[]) {
      return (getSql() as unknown as (...args: unknown[]) => unknown)(
        ...argArray,
      );
    },
  },
);

/** Commits when `fn` resolves; rolls back when it throws. */
export async function withTransaction<T>(
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return getSql().begin(fn);
}

/** For tests and script teardown. */
export async function closeDb(): Promise<void> {
  const inner = globalThis.__ggcbDb;
  if (inner) {
    globalThis.__ggcbDb = undefined;
    await inner.end({ timeout: 5 });
  }
}

export { getQueryStats, queryStatsEnabled, trackQueries };
export { createDbClient } from "./connection";
export * from "./enums";
export * from "./types";
