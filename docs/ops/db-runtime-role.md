# Runtime DB role: `ggcb_app`

The application never connects as the `postgres`/owner role. Migration
`0006` creates `ggcb_app`:

```
NOLOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
statement_timeout = 15s
idle_in_transaction_session_timeout = 30s
search_path = public, extensions
```

It has NO `BYPASSRLS` on purpose: every table it can reach is reachable only
because it holds both the grant AND a matching RLS policy — a table added
without both stays unreachable (`db:verify` fails first).

## One-time owner step (per environment)

Migrations never set passwords. After running `0006` on a Supabase project:

```sql
ALTER ROLE ggcb_app WITH LOGIN PASSWORD '<generated-strong-password>';
```

Run it in the Supabase SQL editor (or `psql` via the **direct** connection)
as the `postgres` role. Store the password in the project's secrets only —
never in the repo, logs, or `.env.example`.

## Pooler `DATABASE_URL` for a custom role

Supabase transaction-mode pooler URL for a custom role:

<!-- secretlint-disable -->

```
postgresql://<role>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

The direct/migrations URL stays on port `5432` as `DIRECT_URL`
(`postgresql://postgres:<db-password>@db.<ref>.supabase.co:5432/postgres`).

**Not verified offline** (needs a real Supabase dev project — acceptance
step for the owner):

1. Whether the project pooler accepts non-`postgres` users on `:6543`
   directly, or requires the `role.projectref` username format
   (`ggcb_app.<project-ref>`). Supabase documents custom-role support via
   the pooler; if plain `ggcb_app` is refused, use
   `postgresql://ggcb_app.<project-ref>:<password>@aws-0-...:6543/postgres`.
2. `search_path` set via `ALTER ROLE … SET` is honoured through the pooler
   in transaction mode — it is a server-side role setting, so it should be,
   but `citext` resolution in `extensions` schema is the concrete thing to
   check (a failing symptom would be `type "citext" does not exist` on
   queries that cast/compare email columns — the runtime uses raw `citext`
   columns so this only surfaces if SQL references the type explicitly).
3. `prepare: false` is required for the transaction-mode pooler — already
   the client default; verify `pg_prepared_statements` stays empty through
   the pooler.

Owner acceptance steps against a Supabase **dev** project:

```powershell
$env:DIRECT_URL = "postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres"
$env:MIGRATE_CONFIRM = "yes"
pnpm db:migrate          # applies 0001-0006, prints target host only
pnpm db:status           # 6 applied, 0 pending
# one-time: ALTER ROLE ggcb_app WITH LOGIN PASSWORD '...'  (SQL editor)
$env:TEST_DIRECT_URL = "postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres"
pnpm db:verify           # every check passes incl. anon/authenticated revokes
```

<!-- secretlint-enable -->

`db:verify` skips the destructive-test interlock because it is read-only
plus two throwaway `SET ROLE` probes — but `test:db` itself will still
refuse non-local targets; run it against a local/CI Postgres, not the
Supabase project.
