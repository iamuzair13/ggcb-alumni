import { describe, expect, it } from "vitest";
import {
  assertMigrationTarget,
  assertTestDatabase,
  describeTarget,
} from "../../../scripts/lib/safety";

/**
 * The safety interlock must provably abort on non-local hosts — this suite
 * needs no database.
 */
describe("db safety interlocks", () => {
  it("describeTarget never leaks credentials", () => {
    expect(
      describeTarget("postgresql://alice:secret@db.host.co:5432/ggcb"),
    ).toBe("db.host.co/ggcb");
  });

  it("assertMigrationTarget refuses remote hosts without MIGRATE_CONFIRM", () => {
    const remote =
      "postgresql://postgres:pw@db.abcdef.supabase.co:5432/postgres";
    expect(() => assertMigrationTarget(remote, undefined)).toThrow(
      /non-local host/,
    );
    expect(() => assertMigrationTarget(remote, "yes")).not.toThrow();
  });

  it("assertTestDatabase requires a local host AND a 'test' database name", () => {
    expect(() =>
      assertTestDatabase(
        "postgresql://postgres:pw@db.supabase.co:5432/ggcb_test",
      ),
    ).toThrow(/non-local host/);
    expect(() =>
      assertTestDatabase("postgresql://postgres:pw@localhost:5432/ggcb_prod"),
    ).toThrow(/must contain "test"/);
    expect(() =>
      assertTestDatabase("postgresql://postgres:pw@localhost:5432/ggcb_test"),
    ).not.toThrow();
    expect(() =>
      assertTestDatabase("postgresql://postgres:pw@postgres:5432/ggcb_test"),
    ).not.toThrow();
  });
});
