import { describe, expect, it } from "vitest";
import {
  buildListHref,
  clampPage,
  firstParam,
  parseEnum,
  parsePage,
  parseQuery,
} from "@/lib/list-params";

describe("list params", () => {
  it("firstParam unwraps arrays", () => {
    expect(firstParam(["a", "b"])).toBe("a");
    expect(firstParam("x")).toBe("x");
    expect(firstParam(undefined)).toBeUndefined();
  });

  it("parsePage defaults to 1 and accepts ≥1", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("4")).toBe(4);
  });

  it("clampPage stays inside [1, totalPages]", () => {
    expect(clampPage(1, 0, 20)).toBe(1);
    expect(clampPage(99, 45, 20)).toBe(3);
    expect(clampPage(2, 45, 20)).toBe(2);
  });

  it("parseEnum rejects values outside the allow-list", () => {
    const allow = ["admin", "viewer"] as const;
    expect(parseEnum("admin", allow)).toBe("admin");
    expect(parseEnum("superuser", allow)).toBeUndefined();
    expect(parseEnum(undefined, allow)).toBeUndefined();
  });

  it("parseQuery trims and drops empties", () => {
    expect(parseQuery("  ada  ")).toBe("ada");
    expect(parseQuery("   ")).toBeUndefined();
    expect(parseQuery(undefined)).toBeUndefined();
  });

  it("buildListHref merges params and clears overrides", () => {
    const href = buildListHref(
      "/admin/users",
      { q: "ada", role: "admin", page: "2" },
      { page: undefined, status: "inactive" },
    );
    expect(href).toBe("/admin/users?q=ada&role=admin&status=inactive");
  });

  it("buildListHref keeps param order stable and drops the path-only case", () => {
    expect(buildListHref("/x", {}, {})).toBe("/x");
  });
});
