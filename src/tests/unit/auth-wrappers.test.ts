import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

let user: {
  id: string;
  name: string;
  role: string;
  sessionVersion: number;
} | null = null;
vi.mock("@/server/auth/session", () => ({
  getCurrentUser: async () => user,
}));

import {
  defineRoute,
  defineAction,
  assertSameOrigin,
} from "@/server/auth/route";

const ctx = { params: Promise.resolve({}) };
const req = (method = "GET", headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/x", { method, headers });

beforeEach(() => {
  user = null;
});

describe("defineRoute", () => {
  it("anonymous → 401 JSON, uniform shape, no internals", async () => {
    const h = defineRoute({
      roles: "any",
      handler: async () => Response.json({ ok: true }),
    });
    const res = await h(req(), ctx);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: expect.any(String) },
    });
  });
  it("wrong role → 403 JSON", async () => {
    user = { id: "u", name: "n", role: "viewer", sessionVersion: 1 };
    const h = defineRoute({
      roles: ["superadmin"],
      handler: async () => Response.json({ ok: true }),
    });
    expect((await h(req(), ctx)).status).toBe(403);
  });
  it("allowed role → handler runs", async () => {
    user = { id: "u", name: "n", role: "superadmin", sessionVersion: 1 };
    const h = defineRoute({
      roles: ["superadmin"],
      handler: async (_r, _c, u) => Response.json({ role: u?.role }),
    });
    const res = await h(req(), ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).role).toBe("superadmin");
  });
  it("public → handler runs without a session", async () => {
    const h = defineRoute({
      roles: "public",
      handler: async () => Response.json({ ok: true }),
    });
    expect((await h(req(), ctx)).status).toBe(200);
  });
});

describe("defineAction — authorize BEFORE validate", () => {
  const schema = z.object({ n: z.number() });
  it("anonymous → UNAUTHORIZED even with VALID input (handler never runs)", async () => {
    const handler = vi.fn(async () => 42);
    const action = defineAction({ roles: "any", input: schema, handler });
    const res = await action({ n: 1 });
    expect(res).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
    expect(handler).not.toHaveBeenCalled();
  });
  it("wrong role → FORBIDDEN, handler never runs", async () => {
    user = { id: "u", name: "n", role: "alumni", sessionVersion: 1 };
    const handler = vi.fn(async () => 42);
    const action = defineAction({ roles: ["admin"], input: schema, handler });
    expect(await action({ n: 1 })).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
    expect(handler).not.toHaveBeenCalled();
  });
  it("right role + bad input → INVALID_INPUT, handler never runs", async () => {
    user = { id: "u", name: "n", role: "admin", sessionVersion: 1 };
    const handler = vi.fn(async () => 42);
    const action = defineAction({ roles: ["admin"], input: schema, handler });
    expect(await action({ n: "x" })).toMatchObject({
      ok: false,
      code: "INVALID_INPUT",
    });
    expect(handler).not.toHaveBeenCalled();
  });
  it("right role + valid input → handler runs, typed result", async () => {
    user = { id: "u", name: "n", role: "admin", sessionVersion: 1 };
    const action = defineAction({
      roles: ["admin"],
      input: schema,
      handler: async ({ input }) => input.n * 2,
    });
    expect(await action({ n: 21 })).toEqual({ ok: true, data: 42 });
  });
});

describe("assertSameOrigin", () => {
  it("GET passes regardless of Origin", () => {
    expect(() =>
      assertSameOrigin(req("GET", { origin: "https://evil.com" })),
    ).not.toThrow();
  });
  it("POST with matching Origin passes", () => {
    expect(() =>
      assertSameOrigin(
        req("POST", {
          origin: "http://localhost",
          "x-forwarded-host": "localhost",
        }),
      ),
    ).not.toThrow();
  });
  it("POST with mismatched Origin is rejected", () => {
    expect(() =>
      assertSameOrigin(
        req("POST", {
          origin: "https://evil.com",
          "x-forwarded-host": "localhost",
        }),
      ),
    ).toThrow("cross-origin");
  });
  it("POST without Origin is allowed (cookie-lax covers same-site forms)", () => {
    expect(() => assertSameOrigin(req("POST"))).not.toThrow();
  });
});
