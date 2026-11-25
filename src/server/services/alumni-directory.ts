import "server-only";
/**
 * Alumni directory read model — /admin/alumni (context.md §4.4).
 * Four tab counts + a filtered, paginated list + one grouped query per
 * filter option set + the change-request queue. All reads; decisions
 * (approve/reject/feature/change-request) land with the E-card slice —
 * verification must issue an E-card in the same transaction (§4.5).
 */
import { sql } from "@/server/db";
import {
  clampPage,
  firstParam,
  parseEnum,
  parsePage,
  parseQuery,
  type SearchParams,
} from "@/lib/list-params";
import type { Datasource, VerifyStatus } from "@/lib/constants/statuses";

export const DIRECTORY_PAGE_SIZE = 15;

export type DirectoryTab =
  "verified" | "under_approval" | "rejected" | "requests";
export const DIRECTORY_TABS: readonly DirectoryTab[] = [
  "verified",
  "under_approval",
  "rejected",
  "requests",
];

export type DirectorySort = "name" | "name_desc" | "year" | "recent";
export const DIRECTORY_SORTS: readonly DirectorySort[] = [
  "name",
  "name_desc",
  "year",
  "recent",
];

export interface DirectoryFilters {
  verifyStatus: Exclude<DirectoryTab, "requests">;
  q?: string;
  departmentId?: string;
  passingYear?: number;
  city?: string;
  district?: string;
  sector?: string;
  gender?: string;
  featured?: boolean;
  sort: DirectorySort;
  page: number;
}

export interface DirectoryRow {
  id: string;
  fullName: string;
  rollNumber: string;
  departmentName: string;
  passingYear: number | null;
  city: string | null;
  verifyStatus: VerifyStatus;
  datasource: Datasource;
  isFeatured: boolean;
  createdAt: string;
}

export interface DirectoryTabCounts {
  verified: number;
  underApproval: number;
  rejected: number;
  pendingChangeRequests: number;
}

export interface DirectoryFilterOptions {
  departments: { id: string; name: string }[];
  passingYears: number[];
  cities: string[];
  districts: string[];
  sectors: string[];
}

export interface ChangeRequestRow {
  id: string;
  alumniId: string;
  alumniName: string;
  rollNumber: string;
  /** Human labels for the fields this request touches. */
  fields: string[];
  status: "pending" | "approved" | "rejected";
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

/** Labels for the restricted fields a change request may touch (§4.3). */
const FIELD_LABELS: Record<string, string> = {
  full_name: "Full name",
  roll_number: "Roll number",
  department: "Department",
  session: "Session",
  session_start_year: "Session start",
  session_end_year: "Session end",
  passing_year: "Passing year",
  gender: "Gender",
};

const like = (s?: string) =>
  s ? `%${s.replaceAll("%", "").replaceAll("_", "")}%` : null;

interface RowSql {
  id: string;
  full_name: string;
  roll_number: string;
  department_name: string;
  passing_year: number | null;
  city: string | null;
  verify_status: VerifyStatus;
  datasource: Datasource;
  is_featured: boolean;
  created_at: Date;
}

function toRow(r: RowSql): DirectoryRow {
  return {
    id: r.id,
    fullName: r.full_name,
    rollNumber: r.roll_number,
    departmentName: r.department_name,
    passingYear: r.passing_year,
    city: r.city,
    verifyStatus: r.verify_status,
    datasource: r.datasource,
    isFeatured: r.is_featured,
    createdAt: r.created_at.toISOString(),
  };
}

export async function directoryTabCounts(): Promise<DirectoryTabCounts> {
  const [c] = await sql<DirectoryTabCounts[]>`
    SELECT count(*) FILTER (WHERE verify_status = 'verified')::int AS verified,
           count(*) FILTER (WHERE verify_status = 'under_approval')::int
             AS "underApproval",
           count(*) FILTER (WHERE verify_status = 'rejected')::int AS rejected,
           (SELECT count(*) FROM alumni_change_requests
            WHERE status = 'pending')::int AS "pendingChangeRequests"
    FROM alumni
  `;
  return c;
}

/** One grouped query per option set — four small scans in parallel. */
export async function directoryFilterOptions(): Promise<DirectoryFilterOptions> {
  const [departments, years, cities, districts, sectors] = await Promise.all([
    sql<{ id: string; name: string }[]>`
      SELECT id, name FROM departments WHERE is_active ORDER BY name
    `,
    sql<{ year: number }[]>`
      SELECT DISTINCT passing_year AS year FROM alumni
      WHERE passing_year IS NOT NULL ORDER BY year DESC
    `,
    sql<{ v: string }[]>`
      SELECT DISTINCT city AS v FROM alumni
      WHERE city IS NOT NULL AND btrim(city) <> '' ORDER BY v
    `,
    sql<{ v: string }[]>`
      SELECT DISTINCT district AS v FROM alumni
      WHERE district IS NOT NULL AND btrim(district) <> '' ORDER BY v
    `,
    sql<{ v: string }[]>`
      SELECT DISTINCT sector AS v FROM alumni
      WHERE sector IS NOT NULL AND btrim(sector) <> '' ORDER BY v
    `,
  ]);
  return {
    departments,
    passingYears: years.map((y) => y.year),
    cities: cities.map((c) => c.v),
    districts: districts.map((d) => d.v),
    sectors: sectors.map((s) => s.v),
  };
}

/** Filtered page of alumni — the WHERE fragment feeds both list + count. */
export async function listAlumni(
  f: DirectoryFilters,
): Promise<{ rows: DirectoryRow[]; total: number }> {
  const q = like(f.q);
  const dept = f.departmentId ?? null;
  const year = f.passingYear ?? null;
  const city = like(f.city);
  const district = like(f.district);
  const sector = like(f.sector);
  const gender = f.gender ?? null;
  const featured = f.featured ? true : null;

  const where = sql`
    a.verify_status = ${f.verifyStatus}
    AND (${q}::text IS NULL OR a.full_name ILIKE ${q}
         OR a.roll_number ILIKE ${q} OR a.email ILIKE ${q})
    AND (${dept}::uuid IS NULL OR a.department_id = ${dept})
    AND (${year}::int IS NULL OR a.passing_year = ${year})
    AND (${city}::text IS NULL OR a.city ILIKE ${city})
    AND (${district}::text IS NULL OR a.district ILIKE ${district})
    AND (${sector}::text IS NULL OR a.sector ILIKE ${sector})
    AND (${gender}::text IS NULL OR a.gender = ${gender}::gender_type)
    AND (${featured}::boolean IS NULL OR a.is_featured)
  `;
  const orderBy =
    f.sort === "name_desc"
      ? sql`a.full_name DESC`
      : f.sort === "year"
        ? sql`a.passing_year DESC NULLS LAST, a.full_name`
        : f.sort === "recent"
          ? sql`a.created_at DESC`
          : sql`a.full_name`;

  const [rows, [countRow]] = await Promise.all([
    sql<RowSql[]>`
      SELECT a.id, a.full_name, a.roll_number, d.name AS department_name,
             a.passing_year, a.city, a.verify_status, a.datasource,
             a.is_featured, a.created_at
      FROM alumni a JOIN departments d ON d.id = a.department_id
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${DIRECTORY_PAGE_SIZE}
      OFFSET ${(f.page - 1) * DIRECTORY_PAGE_SIZE}
    `,
    sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM alumni a WHERE ${where}
    `,
  ]);
  return { rows: rows.map(toRow), total: countRow.n };
}

interface RequestSql {
  id: string;
  alumni_id: string;
  full_name: string;
  roll_number: string;
  changes: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: Date;
  reviewed_at: Date | null;
}

/** Change-request queue — pending first, then newest. */
export async function listChangeRequests(opts: {
  q?: string;
  page: number;
}): Promise<{ rows: ChangeRequestRow[]; total: number }> {
  const q = like(opts.q);
  const [rows, [countRow]] = await Promise.all([
    sql<RequestSql[]>`
      SELECT r.id, r.alumni_id, a.full_name, a.roll_number, r.changes,
             r.status, r.review_note, r.created_at, r.reviewed_at
      FROM alumni_change_requests r
      JOIN alumni a ON a.id = r.alumni_id
      WHERE (${q}::text IS NULL OR a.full_name ILIKE ${q}
             OR a.roll_number ILIKE ${q})
      ORDER BY (r.status = 'pending') DESC, r.created_at DESC
      LIMIT ${DIRECTORY_PAGE_SIZE}
      OFFSET ${(opts.page - 1) * DIRECTORY_PAGE_SIZE}
    `,
    sql<{ n: number }[]>`
      SELECT count(*)::int AS n
      FROM alumni_change_requests r JOIN alumni a ON a.id = r.alumni_id
      WHERE (${q}::text IS NULL OR a.full_name ILIKE ${q}
             OR a.roll_number ILIKE ${q})
    `,
  ]);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      alumniId: r.alumni_id,
      alumniName: r.full_name,
      rollNumber: r.roll_number,
      fields: Object.keys(r.changes).map((k) => FIELD_LABELS[k] ?? k),
      status: r.status,
      reviewNote: r.review_note,
      createdAt: r.created_at.toISOString(),
      reviewedAt: r.reviewed_at?.toISOString() ?? null,
    })),
    total: countRow.n,
  };
}

/* ── page-level orchestration (parse → counts/options → list + clamp) ── */

const GENDERS = ["male", "female", "other"] as const;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DirectorySlice {
  tab: DirectoryTab;
  sort: DirectorySort;
  counts: DirectoryTabCounts;
  options: DirectoryFilterOptions;
  rows: DirectoryRow[];
  requests: ChangeRequestRow[];
  total: number;
  page: number;
  /** Any narrowing (q or a filter) is active — changes empty-state copy. */
  narrowed: boolean;
}

/**
 * The whole URL-driven read: parse params (bad input → defaults, never
 * 500), then counts+options concurrently, then the tab's list with the
 * page re-clamped against the real total (deep links may overshoot).
 */
export async function loadDirectorySlice(
  sp: SearchParams,
): Promise<DirectorySlice> {
  const tab = parseEnum(sp.tab, DIRECTORY_TABS) ?? "verified";
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

  let rows: DirectoryRow[] = [];
  let requests: ChangeRequestRow[] = [];
  let total = 0;

  if (tab === "requests") {
    const first = await listChangeRequests({ q, page: parsePage(sp.page) });
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

  return {
    tab,
    sort,
    counts,
    options,
    rows,
    requests,
    total,
    page: clampPage(parsePage(sp.page), total, DIRECTORY_PAGE_SIZE),
    narrowed,
  };
}
