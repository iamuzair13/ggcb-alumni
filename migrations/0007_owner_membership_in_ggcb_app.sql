-- 0007_owner_membership_in_ggcb_app.sql
-- Grant the migration owner membership in ggcb_app so `SET ROLE ggcb_app`
-- works during `db:verify` and the test-suite's privilege probes.
--
-- Required on Supabase, where the `postgres` role is NOT a true superuser
-- and cannot SET ROLE into arbitrary roles; harmless on plain Postgres,
-- where a superuser needs no membership. Membership adds no privilege the
-- owner did not already have — it only unlocks the impersonation probe.

GRANT ggcb_app TO CURRENT_USER;
