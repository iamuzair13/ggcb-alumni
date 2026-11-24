import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch } from "@/lib/api/client";

function mockResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("apiFetch", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns parsed JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => mockResponse(200, { status: "ok" })),
    );
    await expect(apiFetch<{ status: string }>("/api/health")).resolves.toEqual({
      status: "ok",
    });
  });

  it("sends JSON headers and stringifies the body", async () => {
    const spy = vi.fn<typeof fetch>(async () => mockResponse(200, {}));
    vi.stubGlobal("fetch", spy);
    await apiFetch("/api/x", { method: "POST", body: { a: 1 } });
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe("/api/x");
    expect((init!.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(init!.body).toBe(JSON.stringify({ a: 1 }));
  });

  it("parses error bodies into a single ApiError shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        mockResponse(422, { message: "Roll number already exists" }),
      ),
    );
    const err = (await apiFetch("/api/x").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("http_error");
    expect(err.status).toBe(422);
    expect(err.message).toBe("Roll number already exists");
  });

  it("falls back to a generic message when the body has none", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => mockResponse(500, { unexpected: true })),
    );
    const err = (await apiFetch("/api/x").catch((e) => e)) as ApiError;
    expect(err.message).toBe("Request failed with status 500");
  });

  it("surfaces a network_error without leaking internals", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed: ECONNREFUSED stacktrace…");
      }),
    );
    const err = (await apiFetch("/api/x").catch((e) => e)) as ApiError;
    expect(err.code).toBe("network_error");
    expect(err.message).toBe("Network request failed");
  });

  it("maps aborts to the aborted code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("Aborted", "AbortError");
      }),
    );
    const err = (await apiFetch("/api/x").catch((e) => e)) as ApiError;
    expect(err.code).toBe("aborted");
  });

  it("fails on non-JSON success bodies with invalid_json", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => mockResponse(200, "<html>not json</html>")),
    );
    const err = (await apiFetch("/api/x").catch((e) => e)) as ApiError;
    expect(err.code).toBe("invalid_json");
  });
});
