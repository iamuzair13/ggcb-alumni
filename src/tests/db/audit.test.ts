import { afterAll, describe, expect, it } from "vitest";
import { closeTestConns, getAppSql, getDirectSql, hasTestDb } from "./helpers";

const AUDIT = [
  {
    table: "email_logs",
    insert: `INSERT INTO email_logs (to_email, template, status) VALUES ('a@b.c', 't', 'sent')`,
  },
  {
    table: "admin_activity_logs",
    insert: `INSERT INTO admin_activity_logs (action) VALUES ('test.audit')`,
  },
  {
    table: "login_logs",
    insert: `INSERT INTO login_logs (email_attempted, success) VALUES ('a@b.c', true)`,
  },
] as const;

describe.skipIf(!hasTestDb)("audit immutability (real postgres)", () => {
  afterAll(() => closeTestConns());

  it("UPDATE and DELETE fail on every audit table — even as the migration owner", async () => {
    const owner = getDirectSql();
    for (const { table, insert } of AUDIT) {
      await owner.unsafe(insert); // seed one row so the trigger is exercised
      await expect(
        owner.unsafe(`UPDATE ${table} SET created_at = now()`),
      ).rejects.toThrow(/append-only/);
      await expect(owner.unsafe(`DELETE FROM ${table}`)).rejects.toThrow(
        /append-only/,
      );
    }
  });

  it("ggcb_app cannot UPDATE or DELETE audit rows (grant + trigger)", async () => {
    const app = getAppSql();
    for (const { table } of AUDIT) {
      await expect(
        app.unsafe(`UPDATE ${table} SET created_at = now()`),
      ).rejects.toThrow();
      await expect(app.unsafe(`DELETE FROM ${table}`)).rejects.toThrow();
    }
  });
});
