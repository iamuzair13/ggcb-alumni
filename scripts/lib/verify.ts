/**
 * db:verify — security posture assertions. Fails (non-empty failures list)
 * when any check is false. Used by the `db:verify` script, `test:db`, and CI.
 */
import type postgres from "postgres";

/** The §5.2 grant matrix — the single place expected privileges live. */
export const EXPECTED_GRANTS: Record<string, readonly string[]> = {
  users: ["SELECT", "INSERT", "UPDATE"],
  alumni: ["SELECT", "INSERT", "UPDATE"],
  alumni_change_requests: ["SELECT", "INSERT", "UPDATE"],
  departments: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  auth_attempts: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  auth_tokens: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  email_outbox: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  email_logs: ["SELECT", "INSERT"],
  admin_activity_logs: ["SELECT", "INSERT"],
  login_logs: ["SELECT", "INSERT"],
  applied_migrations: ["SELECT"],
};

export const AUDIT_TABLES = [
  "email_logs",
  "admin_activity_logs",
  "login_logs",
] as const;
export const FORBIDDEN_COLUMNS = [
  "cnic",
  "sap_id",
  "faculty_id",
  "program_id",
] as const;
const API_ROLES = ["anon", "authenticated"] as const;

async function roleExists(sql: postgres.Sql, role: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM pg_roles WHERE rolname = ${role}`;
  return rows.length > 0;
}

export async function runVerify(sql: postgres.Sql): Promise<string[]> {
  const failures: string[] = [];

  // 1. RLS enabled on every public table.
  const tables = await sql<{ relname: string; relrowsecurity: boolean }[]>`
    SELECT c.relname, c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `;
  for (const t of tables) {
    if (!t.relrowsecurity)
      failures.push(`RLS not enabled on public.${t.relname}`);
  }
  const tableNames = new Set(tables.map((t) => t.relname));

  // 2. anon/authenticated hold zero privileges anywhere in public.
  for (const role of API_ROLES) {
    if (!(await roleExists(sql, role))) continue;
    for (const t of tableNames) {
      const [has] = await sql<{ any: boolean }[]>`
        SELECT has_table_privilege(${role}, ${`public.${t}`}, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS any
      `;
      if (has.any)
        failures.push(`${role} still holds table privileges on public.${t}`);
    }
    const seqs = await sql<{ relname: string }[]>`
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'S'
    `;
    for (const s of seqs) {
      const [has] = await sql<{ any: boolean }[]>`
        SELECT has_sequence_privilege(${role}, ${`public.${s.relname}`}, 'USAGE,SELECT,UPDATE') AS any
      `;
      if (has.any)
        failures.push(
          `${role} still holds sequence privileges on public.${s.relname}`,
        );
    }
    const funcs = await sql<{ sig: string }[]>`
      SELECT p.oid::regprocedure::text AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
    `;
    for (const f of funcs) {
      const [has] = await sql<{ any: boolean }[]>`
        SELECT has_function_privilege(${role}, ${f.sig}, 'EXECUTE') AS any
      `;
      if (has.any) failures.push(`${role} can execute function ${f.sig}`);
    }
  }

  // 3. ggcb_app holds exactly the expected table grants — no more, no less.
  if (!(await roleExists(sql, "ggcb_app"))) {
    failures.push("role ggcb_app does not exist");
  } else {
    const grants = await sql<{ table_name: string; privilege_type: string }[]>`
      SELECT table_name, privilege_type
      FROM information_schema.role_table_grants
      WHERE grantee = 'ggcb_app' AND table_schema = 'public'
    `;
    const actual = new Map<string, Set<string>>();
    for (const g of grants) {
      if (!actual.has(g.table_name)) actual.set(g.table_name, new Set());
      actual.get(g.table_name)!.add(g.privilege_type);
    }
    for (const [table, expected] of Object.entries(EXPECTED_GRANTS)) {
      const got = actual.get(table) ?? new Set<string>();
      for (const cmd of expected) {
        if (!got.has(cmd))
          failures.push(`ggcb_app missing ${cmd} on public.${table}`);
      }
      for (const cmd of got) {
        if (!expected.includes(cmd)) {
          failures.push(`ggcb_app holds unexpected ${cmd} on public.${table}`);
        }
      }
      actual.delete(table);
    }
    for (const [table, cmds] of actual) {
      failures.push(
        `ggcb_app has grants on untracked table public.${table}: ${[...cmds].join(",")}`,
      );
    }

    // 4. Every table ggcb_app can touch has a matching policy per command.
    const policies = await sql<
      { tablename: string; policyname: string; cmd: string }[]
    >`
      SELECT tablename, policyname, cmd
      FROM pg_policies
      WHERE schemaname = 'public'
        AND 'ggcb_app' = ANY (roles)
    `;
    const policyCmds = new Map<string, Set<string>>();
    for (const p of policies) {
      if (!policyCmds.has(p.tablename)) policyCmds.set(p.tablename, new Set());
      policyCmds.get(p.tablename)!.add(p.cmd);
    }
    for (const [table, cmds] of Object.entries(EXPECTED_GRANTS)) {
      const seen = policyCmds.get(table) ?? new Set<string>();
      for (const cmd of cmds) {
        if (!seen.has(cmd) && !seen.has("ALL")) {
          failures.push(`no RLS policy for ggcb_app ${cmd} on public.${table}`);
        }
      }
    }
  }

  // 5. Audit tables reject UPDATE/DELETE — as ggcb_app and as the owner
  //    (the trigger must catch even a privileged writer).
  for (const table of AUDIT_TABLES) {
    const col =
      table === "email_logs"
        ? "status"
        : table === "login_logs"
          ? "success"
          : "action";
    try {
      await sql.unsafe(`UPDATE public.${table} SET ${col} = ${col}`);
      failures.push(`UPDATE allowed on audit table ${table} (owner)`);
    } catch {
      /* expected: trigger rejects */
    }
    try {
      await sql.unsafe(`DELETE FROM public.${table}`);
      failures.push(`DELETE allowed on audit table ${table} (owner)`);
    } catch {
      /* expected: trigger rejects */
    }
    if (await roleExists(sql, "ggcb_app")) {
      await sql.unsafe("SET ROLE ggcb_app");
      try {
        await sql.unsafe(`UPDATE public.${table} SET ${col} = ${col}`);
        failures.push(`UPDATE allowed on audit table ${table} (ggcb_app)`);
      } catch {
        /* expected: grant/RLS/trigger rejects */
      }
      try {
        await sql.unsafe(`DELETE FROM public.${table}`);
        failures.push(`DELETE allowed on audit table ${table} (ggcb_app)`);
      } catch {
        /* expected */
      }
      await sql.unsafe("RESET ROLE").catch(() => {});
    }
  }

  // 6. Forbidden columns must not exist.
  const badCols = await sql<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = ANY(${[...FORBIDDEN_COLUMNS]})
  `;
  for (const c of badCols) {
    failures.push(`forbidden column ${c.table_name}.${c.column_name}`);
  }

  return failures;
}
