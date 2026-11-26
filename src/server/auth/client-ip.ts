/**
 * Client-IP extraction. The ONLY trusted source on Vercel is the
 * platform-written `x-vercel-forwarded-for`/`x-real-ip` — the platform
 * overwrites them, so clients cannot spoof them.
 *
 * An arbitrary `x-forwarded-for` is NEVER trusted in production: it is
 * client-controlled and would let an attacker rotate identities to defeat
 * IP-based rate limiting. Off-Vercel (local dev) we fall back to
 * `x-real-ip`/`x-forwarded-for` then localhost, because there is no
 * platform to trust.
 */
export function getClientIp(request: Request): string | null {
  const h = request.headers;
  if (process.env.VERCEL) {
    const vff = h.get("x-vercel-forwarded-for");
    if (vff) {
      const first = vff.split(",")[0]?.trim();
      return first || null;
    }
    return h.get("x-real-ip");
  }
  // Non-Vercel (dev/test): headers are best-effort — there is no trusted hop.
  const real = h.get("x-real-ip") ?? h.get("x-forwarded-for");
  if (real) return real.split(",")[0]?.trim() ?? null;
  return "127.0.0.1";
}
