import { describe, expect, it } from "vitest";
import { sanitizeCallbackUrl } from "@/server/auth/callback-url";

describe("sanitizeCallbackUrl — open-redirect corpus", () => {
  it("accepts relative same-origin paths", () => {
    expect(sanitizeCallbackUrl("/admin")).toBe("/admin");
    expect(sanitizeCallbackUrl("/dashboard")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("/admin/alumni?tab=verified")).toBe(
      "/admin/alumni?tab=verified",
    );
  });

  it("rejects protocol-relative and absolute URLs", () => {
    for (const v of [
      "//evil.com",
      "//evil.com/x",
      "https://evil.com",
      "http://x",
      "https://evil.com",
    ]) {
      expect(sanitizeCallbackUrl(v), v).toBe("/");
    }
  });

  it("rejects schemes, backslashes, and control characters", () => {
    for (const v of [
      "javascript:alert(1)",
      "/\\evil",
      "\\evil",
      "/path\tevil",
      "/path\x00evil",
      "data:text/html,<b>",
      "mailto:a@b.c",
    ]) {
      expect(sanitizeCallbackUrl(v), v).toBe("/");
    }
  });

  it("rejects encoded smuggling variants", () => {
    for (const v of [
      "%2f%2fevil.com",
      "/%2fevil.com",
      "%5c%5cevil",
      "%252f%252fevil.com", // double-encoded → still rejected after one decode pass
      "%68%74%74%70%73://evil.com",
    ]) {
      expect(sanitizeCallbackUrl(v), v).toBe("/");
    }
  });

  it("rejects non-strings, empties, and absurd lengths", () => {
    expect(sanitizeCallbackUrl(null)).toBe("/");
    expect(sanitizeCallbackUrl(undefined)).toBe("/");
    expect(sanitizeCallbackUrl(42)).toBe("/");
    expect(sanitizeCallbackUrl("")).toBe("/");
    expect(sanitizeCallbackUrl("/" + "x".repeat(2000))).toBe("/");
  });

  it("honours a custom fallback", () => {
    expect(sanitizeCallbackUrl("//evil", "/dashboard")).toBe("/dashboard");
  });
});
