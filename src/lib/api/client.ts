/**
 * Typed API client for browser/server-component fetching of our own route
 * handlers.
 *
 * Contract:
 *  - Sends JSON headers; caller opts into credentials explicitly.
 *  - Errors are normalised into one ApiError shape — callers never see raw
 *    Response objects or stack traces.
 *  - Supports AbortSignal for request cancellation (TanStack Query passes one).
 */

export type ApiErrorCode =
  "http_error" | "network_error" | "aborted" | "invalid_json";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | null;
  /** Server-provided machine-readable detail, if the body carried one. */
  readonly details: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    options: { status?: number | null; details?: unknown } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = options.status ?? null;
    this.details = options.details;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  /** JSON-serialisable body. For FormData etc. use fetch directly. */
  body?: unknown;
}

function safeMessage(body: unknown, status: number): string {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    return (body as { error: string }).error;
  }
  return `Request failed with status ${status}`;
}

export async function apiFetch<T>(
  input: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, headers, ...init } = options;

  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("aborted", "Request was aborted");
    }
    throw new ApiError("network_error", "Network request failed", {
      details: error instanceof Error ? error.message : undefined,
    });
  }

  const text = await response.text();
  let json: unknown = null;
  if (text.length > 0) {
    try {
      json = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new ApiError("http_error", `HTTP ${response.status}`, {
          status: response.status,
        });
      }
      throw new ApiError("invalid_json", "Response was not valid JSON", {
        status: response.status,
      });
    }
  }

  if (!response.ok) {
    throw new ApiError("http_error", safeMessage(json, response.status), {
      status: response.status,
      details:
        json && typeof json === "object" && "details" in json
          ? (json as { details: unknown }).details
          : undefined,
    });
  }

  return json as T;
}
