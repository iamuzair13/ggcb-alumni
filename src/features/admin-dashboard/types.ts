/** Admin dashboard VM — context.md §4.8 KPI set + approval queue. */
import type { Datasource, VerifyStatus } from "@/lib/constants/statuses";

/**
 * Narrow row for the two dashboard lists — a full `Alumnus` is structurally
 * assignable to it, so the fixture world satisfies this too.
 */
export interface DashboardAlumnus {
  id: string;
  fullName: string;
  rollNumber: string;
  departmentName: string;
  passingYear: number | null;
  verifyStatus: VerifyStatus;
  datasource: Datasource;
}

export interface AdminDashboardData {
  kpis: {
    totalAlumni: number;
    verified: number;
    underApproval: number;
    rejected: number;
    featured: number;
    /** 0 until the E-card schema lands — there is no ecard table yet. */
    ecardsIssued: number;
    pendingChangeRequests: number;
  };
  pendingQueue: DashboardAlumnus[]; // top 5 under-approval registrations
  recentRegistrations: DashboardAlumnus[];
  trend: { month: string; count: number }[]; // registrations by month
}
