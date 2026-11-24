/**
 * Dev-only query fan-out counter (context.md §7 — ≤5 queries per request).
 * Zero-overhead in production: when disabled, trackQueries() never creates a
 * context and the postgres.js `debug` hook is not installed at all.
 */
import { AsyncLocalStorage } from "node:async_hooks";

interface QueryStore {
  queries: string[];
}

const als = new AsyncLocalStorage<QueryStore>();

export function queryStatsEnabled(): boolean {
  return (
    process.env.DB_QUERY_STATS === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

/** Wired into the postgres.js `debug` hook by the client singleton. */
export function recordQuery(query: string): void {
  als.getStore()?.queries.push(query);
}

export function getQueryStats(): { count: number; queries: string[] } {
  const store = als.getStore();
  return { count: store?.queries.length ?? 0, queries: store?.queries ?? [] };
}

/**
 * Run `fn` inside a query-counting context (tests wrap one logical operation).
 * When stats are disabled this is a pass-through.
 */
export async function trackQueries<T>(
  fn: () => Promise<T> | T,
): Promise<{ result: T; count: number; queries: string[] }> {
  if (!queryStatsEnabled()) {
    return { result: await fn(), count: 0, queries: [] };
  }
  const store: QueryStore = { queries: [] };
  const result = await als.run(store, fn);
  return { result, count: store.queries.length, queries: store.queries };
}
