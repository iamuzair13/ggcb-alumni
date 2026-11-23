import { describe, expect, it } from "vitest";

import { cn, formatDate } from "@/lib/utils";

describe("cn()", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("resolves tailwind conflicts keeping the last class", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });
});

describe("formatDate()", () => {
  it("formats with Intl (no hardcoded format)", () => {
    expect(formatDate("2026-01-15T00:00:00Z")).toBe("15 January 2026");
  });
});
