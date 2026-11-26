import { permanentRedirect } from "next/navigation";

import { requireStaff } from "@/server/auth/session";
import { firstParam, type SearchParams } from "@/lib/list-params";

/**
 * Merged into /admin — the register now lives under the dashboard stats.
 * 308 with the query intact so existing links and bookmarks keep working
 * (e.g. /admin/alumni?tab=requests → /admin?tab=requests).
 */
export default async function AdminAlumniRedirect({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    const v = firstParam(value);
    if (v !== undefined) qs.set(key, v);
  }
  const s = qs.toString();
  permanentRedirect(`/admin${s ? `?${s}` : ""}`);
}
