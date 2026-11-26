import type { AdminDashboardData } from "./types";

export interface AdminDashboardPort {
  load(): AdminDashboardData;
  quickDecide(id: string, decision: "approve" | "reject"): void;
}
