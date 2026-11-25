import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminDashboardView } from "@/components/admin/dashboard-view";
import { AlumniDirectoryView } from "@/components/admin/alumni-directory-view";
import { requireStaff } from "@/server/auth/session";
import { loadAdminDashboard } from "@/server/services/admin-dashboard";
import {
  DIRECTORY_PAGE_SIZE,
  loadDirectorySlice,
} from "@/server/services/alumni-directory";
import { firstParam, type SearchParams } from "@/lib/list-params";

export const metadata: Metadata = { title: "Admin Dashboard" };

// Live aggregates + filtered register read in the page body — allowed to
// block (Cache Components validation is per-segment).
export const instant = false;

/**
 * Admin dashboard — aggregates above, the live register below. The old
 * /admin/alumni route merged here; it now permanentRedirects preserving
 * query params. All list state lives in the URL.
 */
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const sp = await searchParams;
  const [data, slice] = await Promise.all([
    loadAdminDashboard(),
    loadDirectorySlice(sp),
  ]);

  return (
    <AdminDashboardView
      data={data}
      register={
        /* ListToolbar reads useSearchParams — needs a boundary. The stats
           above stay outside so they never suspend. */
        <Suspense>
          <AlumniDirectoryView
            pathname="/admin"
            compact={firstParam(sp.density) === "compact"}
            tab={slice.tab}
            counts={slice.counts}
            params={sp}
            options={slice.options}
            rows={slice.rows}
            requests={slice.requests}
            total={slice.total}
            page={slice.page}
            pageSize={DIRECTORY_PAGE_SIZE}
            sort={slice.sort}
            narrowed={slice.narrowed}
          />
        </Suspense>
      }
    />
  );
}
