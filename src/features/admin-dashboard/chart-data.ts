/**
 * Chart data adapter — the single place where dashboard visualisations
 * source their series. Everything is REAL except where marked: alumni
 * per department has no read model yet (directory counts are global,
 * not per-department), so departmentsTop() ships clearly-labelled mock
 * rows. Swap the body when a query lands — nothing else changes.
 */
import type { ChartDatum } from "@/components/shared/charts";

export const DEPARTMENTS_MOCK = true;

const MOCK_DEPARTMENTS: ChartDatum[] = [
  { label: "Sample Computer Science", value: 32 },
  { label: "Sample Physics", value: 24 },
  { label: "Sample Mathematics", value: 18 },
  { label: "Sample English", value: 12 },
  { label: "Sample Economics", value: 9 },
  { label: "Sample Urdu", value: 5 },
];

/** Top-N alumni by department — MOCK until a grouped count query lands. */
export function departmentsTop(): { data: ChartDatum[]; mock: boolean } {
  return { data: MOCK_DEPARTMENTS, mock: DEPARTMENTS_MOCK };
}

/** Delta of the last two trend buckets — real. */
export function trendDelta(trend: { count: number }[]): {
  delta: number;
  up: boolean;
  /** Previous bucket still zero → delta meaningless. */
  meaningful: boolean;
} {
  const last = trend[trend.length - 1]?.count ?? 0;
  const prev = trend[trend.length - 2]?.count ?? 0;
  return { delta: last - prev, up: last >= prev, meaningful: prev > 0 };
}
