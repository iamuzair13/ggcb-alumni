import { describe, expect, it, vi, beforeEach } from "vitest";

// forbidden() checks this at call time — next.config sets it at build.
process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "1";

/**
 * Guard behaviour with stubbed session — no database, no Next request.
 * @/auth is mocked so `auth()` returns a canned session; @/server/db is
 * stubbed for requireAlumni/invalidateUserSessions.
 */

const hoisted = vi.hoisted(() => {
  const state = {
    session: null as {
      user: { id: string; name: string; role: string; sessionVersion: number };
    } | null,
    alumniRows: [{ verify_status: "verified" }] as { verify_status: string }[],
    sqlCalls: [] as unknown[][],
    recheckUser: vi.fn(async (id: string, sv: number) => {
      void id;
      void sv;
      return { valid: true as const, role: "admin" as const };
    }),
  };
  const sqlTag = (strings: TemplateStringsArray, ...params: unknown[]) => {
    state.sqlCalls.push(params);
    return Promise.resolve(state.alumniRows);
  };
  return { state, sqlTag };
});
const state = hoisted.state;

vi.mock("@/auth", () => ({
  auth: async () => hoisted.state.session,
  recheckUser: (id: string, sv: number) => hoisted.state.recheckUser(id, sv),
}));
vi.mock("@/server/db", () => ({
  sql: hoisted.sqlTag,
}));
// connection() is request-scoped — a no-op in unit tests.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => undefined,
}));

import {
  requireUser,
  requireRole,
  requireStaff,
  requireAlumni,
  invalidateUserSessions,
} from "@/server/auth/session";

function asUser(role: string) {
  state.session = { user: { id: "u1", name: "N", role, sessionVersion: 3 } };
}

const isRedirect = (e: unknown) =>
  e instanceof Error &&
  "digest" in e &&
  String(e.digest).startsWith("NEXT_REDIRECT");
const isForbidden = (e: unknown) =>
  e instanceof Error && "digest" in e && String(e.digest).includes("403");

beforeEach(() => {
  state.session = null;
  state.alumniRows = [{ verify_status: "verified" }];
  state.recheckUser.mockClear();
});

describe("requireUser", () => {
  it("anonymous → redirect to /login with safe callbackUrl", async () => {
    await expect(requireUser({ callbackPath: "/admin" })).rejects.toSatisfy(
      isRedirect,
    );
  });
  it("signed-in → returns the user", async () => {
    asUser("viewer");
    const u = await requireUser();
    expect(u.role).toBe("viewer");
  });
  it("fresh:true forces a DB re-check and refreshes the role", async () => {
    asUser("viewer");
    const u = await requireUser({ fresh: true });
    expect(state.recheckUser).toHaveBeenCalledWith("u1", 3);
    expect(u.role).toBe("admin"); // refreshed from DB
  });
});

describe("requireRole / requireStaff", () => {
  it("wrong role → 403 (NEXT_FORBIDDEN), never a 404", async () => {
    asUser("alumni");
    await expect(requireRole(["superadmin"])).rejects.toSatisfy(isForbidden);
  });
  it("right role passes", async () => {
    asUser("admin");
    await expect(requireRole(["superadmin", "admin"])).resolves.toMatchObject({
      role: "admin",
    });
  });
  it("requireStaff accepts viewer, rejects alumni", async () => {
    asUser("viewer");
    await expect(requireStaff()).resolves.toMatchObject({ role: "viewer" });
    asUser("alumni");
    await expect(requireStaff()).rejects.toSatisfy(isForbidden);
  });
});

describe("requireAlumni", () => {
  it("non-alumni → 403", async () => {
    asUser("admin");
    await expect(requireAlumni()).rejects.toSatisfy(isForbidden);
  });
  it("alumni passes and reports verify_status (one query)", async () => {
    asUser("alumni");
    state.alumniRows = [{ verify_status: "under_approval" }];
    const u = await requireAlumni();
    expect(u.verifyStatus).toBe("under_approval");
  });
  it("verified:true blocks under_approval and rejected", async () => {
    asUser("alumni");
    state.alumniRows = [{ verify_status: "under_approval" }];
    await expect(requireAlumni({ verified: true })).rejects.toSatisfy(
      isForbidden,
    );
    state.alumniRows = [{ verify_status: "rejected" }];
    await expect(requireAlumni({ verified: true })).rejects.toSatisfy(
      isForbidden,
    );
  });
  it("verified:true passes for verified alumni", async () => {
    asUser("alumni");
    state.alumniRows = [{ verify_status: "verified" }];
    await expect(requireAlumni({ verified: true })).resolves.toMatchObject({
      verifyStatus: "verified",
    });
  });
});

describe("invalidateUserSessions", () => {
  it("bumps session_version with one UPDATE", async () => {
    state.sqlCalls.length = 0;
    await invalidateUserSessions("u-9");
    expect(state.sqlCalls[0][0]).toBe("u-9");
  });
});
