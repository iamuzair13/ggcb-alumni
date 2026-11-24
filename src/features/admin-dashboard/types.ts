/** Admin dashboard VM — context.md §4.8 KPI set + approval queue. */
import type { Alumnus } from "@/features/alumni-directory/types";

export interface AdminDashboardData {
  kpis: {
    totalAlumni: number;
    verified: number;
    underApproval: number;
    rejected: number;
    ecardsIssued: number;
    pendingChangeRequests: number;
  };
  pendingQueue: Alumnus[]; // top 5 under-approval registrations
  recentRegistrations: Alumnus[];
  trend: { month: string; count: number }[]; // registrations by month
}
