/**
 * List-state helpers — admin lists keep ALL state in URL search params
 * (blueprint §2): shareable links, working back button, server-driven
 * filtering. Pure parsing lives here for unit tests.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

export function firstParam(
  v: string | string[] | undefined,
): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Clamp a page number into [1, totalPages]. */
export function clampPage(
  page: number,
  total: number,
  pageSize: number,
): number {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(Math.max(1, page), totalPages);
}

/** Page from params — absent/invalid → 1. */
export function parsePage(v: string | string[] | undefined): number {
  const n = Number.parseInt(firstParam(v) ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** Optional enum filter — values outside the allow-list are ignored. */
export function parseEnum<E extends string>(
  v: string | string[] | undefined,
  allow: readonly E[],
): E | undefined {
  const s = firstParam(v);
  return allow.includes(s as E) ? (s as E) : undefined;
}

/** Search query — trimmed, empty → undefined. */
export function parseQuery(
  v: string | string[] | undefined,
): string | undefined {
  const s = firstParam(v)?.trim();
  return s ? s : undefined;
}

/** Build an href preserving all current params plus overrides. */
export function buildListHref(
  pathname: string,
  params: SearchParams,
  overrides: Record<string, string | number | undefined>,
): string {
  const merged = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const val = firstParam(v);
    if (val !== undefined) merged.set(k, val);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined || v === "") merged.delete(k);
    else merged.set(k, String(v));
  }
  const qs = merged.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
