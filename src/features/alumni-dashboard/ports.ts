import type { AlumniDashboardData } from "./types";

export interface AlumniDashboardPort {
  load(alumniId: string): AlumniDashboardData;
}
