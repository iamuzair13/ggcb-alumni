/**
 * Pure Postgres-URL helpers shared by scripts, the server DB client, and
 * tests. No secrets, no side effects — safe to import anywhere.
 */

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  // CI service-container / compose service names — loopback in that context
  "postgres",
  "db",
  "pg",
]);

export function isLocalDbHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

export function parseDbUrl(url: string): {
  hostname: string;
  database: string;
} {
  const parsed = new URL(url);
  return {
    hostname: parsed.hostname,
    database: parsed.pathname.replace(/^\//, ""),
  };
}

/** Host + db name for logs — never credentials. */
export function describeDbTarget(url: string): string {
  const { hostname, database } = parseDbUrl(url);
  return `${hostname}/${database}`;
}
