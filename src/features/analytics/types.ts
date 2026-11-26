/** Analytics VM — context.md §4.8 aggregate set. */
export interface CategoryCount {
  label: string;
  value: number;
}

export interface AnalyticsData {
  totals: {
    alumni: number;
    verified: number;
    underApproval: number;
    rejected: number;
    ecardsIssued: number;
    changeRequestsPending: number;
  };
  byDepartment: CategoryCount[];
  byPassingYear: CategoryCount[];
  registrationsOverTime: { month: string; count: number }[];
  topCities: CategoryCount[];
  topDistricts: CategoryCount[];
  topEmployers: CategoryCount[];
  topSectors: CategoryCount[];
  statusSplit: { status: string; label: string; value: number }[];
}

export type TimeRange = "6m" | "12m" | "all";
