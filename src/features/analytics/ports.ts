import type { AnalyticsData, TimeRange } from "./types";

export interface AnalyticsPort {
  load(range: TimeRange): AnalyticsData;
}
