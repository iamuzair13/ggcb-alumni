import "server-only";
/**
 * Admin dashboard aggregates — /admin (context.md §4.8).
 * Read-only: one grouped count + two 5-row lists + a 6-month registration
 * trend. All four queries hit planned indexes (docs/db/schema.md) and run
 * concurrently on the small pool.
 */
import { sql } from "@/server/db";
import type {
  AdminDashboardData,
  DashboardAlumnus,
} from "@/features/admin-dashboard/types";
import type { Datasource, VerifyStatus } from "@/lib/constants/statuses";

interface KpiRow {
  total: number;
  verified: number;
  under_approval: number;
  rejected: number;
  featured: number;
  pending_change_requests: number;
}

interface AlumnusRow {
  id: string;
  full_name: string;
  roll_number: string;
  department_name: string;
  passing_year: number | null;
  verify_status: VerifyStatus;
  datasource: Datasource;
}

function toAlumnus(r: AlumnusRow): DashboardAlumnus {
  return {
    id: r.id,
    fullName: r.full_name,
    rollNumber: r.roll_number,
    departmentName: r.department_name,
    passingYear: r.passing_year,
    verifyStatus: r.verify_status,
    datasource: r.datasource,
  };
}

export async function loadAdminDashboard(): Promise<AdminDashboardData> {
  const [[kpi], queue, recent, trend] = await Promise.all([
    sql<KpiRow[]>`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE a.verify_status = 'verified')::int
               AS verified,
             count(*) FILTER (WHERE a.verify_status = 'under_approval')::int
               AS under_approval,
             count(*) FILTER (WHERE a.verify_status = 'rejected')::int
               AS rejected,
             count(*) FILTER (WHERE a.is_featured)::int AS featured,
             (SELECT count(*) FROM alumni_change_requests
              WHERE status = 'pending')::int AS pending_change_requests
      FROM alumni a
    `,
    sql<AlumnusRow[]>`
      SELECT a.id, a.full_name, a.roll_number, d.name AS department_name,
             a.passing_year, a.verify_status, a.datasource
      FROM alumni a JOIN departments d ON d.id = a.department_id
      WHERE a.verify_status = 'under_approval'
      ORDER BY a.created_at DESC
      LIMIT 5
    `,
    sql<AlumnusRow[]>`
      SELECT a.id, a.full_name, a.roll_number, d.name AS department_name,
             a.passing_year, a.verify_status, a.datasource
      FROM alumni a JOIN departments d ON d.id = a.department_id
      ORDER BY a.created_at DESC
      LIMIT 5
    `,
    // generate_series keeps zero-registration months in the chart.
    sql<{ month: string; count: number }[]>`
      SELECT to_char(m.m, 'Mon YYYY') AS month, count(a.id)::int AS count
      FROM generate_series(
        date_trunc('month', now()) - interval '5 months',
        date_trunc('month', now()),
        interval '1 month'
      ) AS m(m)
      LEFT JOIN alumni a ON date_trunc('month', a.created_at) = m.m
      GROUP BY m.m
      ORDER BY m.m
    `,
  ]);

  return {
    kpis: {
      totalAlumni: kpi.total,
      verified: kpi.verified,
      underApproval: kpi.under_approval,
      rejected: kpi.rejected,
      featured: kpi.featured,
      ecardsIssued: 0,
      pendingChangeRequests: kpi.pending_change_requests,
    },
    pendingQueue: queue.map(toAlumnus),
    recentRegistrations: recent.map(toAlumnus),
    trend,
  };
}
