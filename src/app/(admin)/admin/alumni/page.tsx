import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { AlumniDirectoryView } from "@/components/admin/alumni-directory-view";
import { requireStaff } from "@/server/auth/session";
import {
  DIRECTORY_PAGE_SIZE,
  DIRECTORY_SORTS,
  DIRECTORY_TABS,
  directoryFilterOptions,
  directoryTabCounts,
  listAlumni,
  listChangeRequests,
  type DirectoryTab,
} from "@/server/services/alumni-directory";
import {
  clampPage,
  firstParam,
  parseEnum,
  parsePage,
  parseQuery,
} from "@/lib/list-params";

export const metadata: Metadata = { title: "Alumni" };

// Live filtered queries in the page body — allowed to block.
export const instant = false;

const GENDERS = ["male", "female", "other"] as const;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Alumni directory — the staff register, tabbed by verification state.
 * Read-only until the E-card slice lands (approve ⇒ issue card, one
 * transaction). All list state lives in the URL.
 */
export default async function AdminAlumniPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff();
  const sp = await searchParams;

  const tab: DirectoryTab = parseEnum(sp.tab, DIRECTORY_TABS) ?? "verified";
  const q = parseQuery(sp.q);
  const sort = parseEnum(sp.sort, DIRECTORY_SORTS) ?? "name";
  const deptParam = firstParam(sp.dept);
  const yearParam = Number.parseInt(firstParam(sp.year) ?? "", 10);
  const filters = {
    q,
    departmentId: deptParam && UUID_RE.test(deptParam) ? deptParam : undefined,
    passingYear:
      Number.isFinite(yearParam) && yearParam >= 1950 && yearParam <= 2100
        ? yearParam
        : undefined,
    city: parseQuery(sp.city),
    district: parseQuery(sp.district),
    sector: parseQuery(sp.sector),
    gender: parseEnum(sp.gender, GENDERS),
    featured: firstParam(sp.featured) === "1" ? true : undefined,
  };
  const narrowed = Object.values(filters).some((v) => v !== undefined);

  const [counts, options] = await Promise.all([
    directoryTabCounts(),
    directoryFilterOptions(),
  ]);

  let rows: Awaited<ReturnType<typeof listAlumni>>["rows"] = [];
  let requests: Awaited<ReturnType<typeof listChangeRequests>>["rows"] = [];
  let total = 0;

  if (tab === "requests") {
    const first = await listChangeRequests({ q, page: parsePage(sp.page) });
    // Re-clamp after we know the real total (deep links may overshoot).
    const page = clampPage(
      parsePage(sp.page),
      first.total,
      DIRECTORY_PAGE_SIZE,
    );
    const data =
      page === parsePage(sp.page)
        ? first
        : await listChangeRequests({ q, page });
    requests = data.rows;
    total = data.total;
  } else {
    const args = {
      verifyStatus: tab,
      ...filters,
      sort,
      page: parsePage(sp.page),
    };
    const first = await listAlumni(args);
    const page = clampPage(
      parsePage(sp.page),
      first.total,
      DIRECTORY_PAGE_SIZE,
    );
    const data =
      page === args.page ? first : await listAlumni({ ...args, page });
    rows = data.rows;
    total = data.total;
  }

  const page = clampPage(parsePage(sp.page), total, DIRECTORY_PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alumni"
        description="The register — every record the college holds, grouped by where it stands."
      />
      {/* ListToolbar reads useSearchParams — needs a boundary (Cache
          Components). The header stays outside so it never suspends. */}
      <Suspense>
        <AlumniDirectoryView
          tab={tab}
          counts={counts}
          params={sp}
          options={options}
          rows={rows}
          requests={requests}
          total={total}
          page={page}
          pageSize={DIRECTORY_PAGE_SIZE}
          sort={sort}
          narrowed={narrowed}
        />
      </Suspense>
    </div>
  );
}
