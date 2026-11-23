/**
 * Pure postgres.js client factory — NO `server-only` import so standalone
 * scripts (migrate/seed/explain under tsx) can reuse it. Anything Next.js can
 * reach goes through ./index.ts which does carry `server-only`.
 */
import postgres from "postgres";
import { isLocalDbHost, parseDbUrl } from "@/lib/db-url";

/** Pooler-safe defaults: transaction-mode pooler → prepare: false, small pool. */
export function createDbClient(
  url: string,
  options: postgres.Options<Record<string, never>> = {},
): postgres.Sql {
  const { hostname } = parseDbUrl(url);
  return postgres(url, {
    prepare: false, // required by transaction-mode poolers
    max: 3, // small pool: serverless instances must not exhaust pooler slots
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: isLocalDbHost(hostname) ? false : "require",
    onnotice: () => {},
    ...options,
  });
}
