"use client";

/**
 * Analytics — /admin/analytics (blueprint §3.3). Read-only: all roles can
 * view; the time-range select only filters the registrations series
 * client-side. Chart grid shows a brief skeleton on mount (demo of the
 * loading state).
 */
import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  BarChartH,
  BarChartV,
  ChartCard,
  DonutChart,
  LineChart,
  type ChartDatum,
} from "@/components/shared/charts";

import type { AnalyticsData, TimeRange } from "../types";

const RANGE_LABELS: Record<TimeRange, string> = {
  "6m": "Last 6 months",
  "12m": "Last 12 months",
  all: "All time",
};

/** Chart card that falls back to an empty state when a series is empty. */
function ChartOrEmpty({
  title,
  summary,
  data,
  height,
  children,
}: {
  title: string;
  summary: string;
  data: ChartDatum[];
  height?: number;
  children: React.ReactNode;
}) {
  if (data.length === 0) {
    return (
      <figure className="rounded-lg border bg-card p-4">
        <figcaption className="text-sm font-semibold">{title}</figcaption>
        <EmptyState
          icon={BarChart3}
          title="Nothing to show yet"
          description="This series has no data for the current selection."
          className="mt-3 border-0"
        />
      </figure>
    );
  }
  return (
    <ChartCard
      title={title}
      summary={summary}
      rows={data.map((d) => [d.label, d.value])}
      height={height}
    >
      {children}
    </ChartCard>
  );
}

function AnalyticsCharts({
  data,
  range,
}: {
  data: AnalyticsData;
  range: TimeRange;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(t);
  }, []);

  if (!ready) {
    return (
      <div className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[280px] rounded-lg" />
        ))}
      </div>
    );
  }

  const registrations =
    range === "all"
      ? data.registrationsOverTime
      : data.registrationsOverTime.slice(range === "6m" ? -6 : -12);
  const regSeries: ChartDatum[] = registrations.map((r) => ({
    label: r.month,
    value: r.count,
  }));

  const summarise = (d: ChartDatum[]) =>
    d.map((x) => `${x.label} ${x.value}`).join(", ");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartOrEmpty
        title="Alumni by department"
        summary={`Alumni per department — ${summarise(data.byDepartment)}.`}
        data={data.byDepartment}
      >
        <BarChartH data={data.byDepartment} />
      </ChartOrEmpty>
      <ChartOrEmpty
        title="Alumni by passing year"
        summary={`Alumni per passing year — ${summarise(data.byPassingYear)}.`}
        data={data.byPassingYear}
      >
        <BarChartV data={data.byPassingYear} />
      </ChartOrEmpty>
      <ChartOrEmpty
        title={`Registrations over time — ${RANGE_LABELS[range].toLowerCase()}`}
        summary={`Registrations per month — ${summarise(regSeries)}.`}
        data={regSeries}
      >
        <LineChart data={regSeries} />
      </ChartOrEmpty>
      <ChartOrEmpty
        title="Status split"
        summary={`Record statuses — ${data.statusSplit
          .map((s) => `${s.label} ${s.value}`)
          .join(", ")}.`}
        data={data.statusSplit.map((s) => ({ label: s.label, value: s.value }))}
      >
        <DonutChart
          data={data.statusSplit.map((s) => ({
            label: s.label,
            value: s.value,
          }))}
        />
      </ChartOrEmpty>
      <ChartOrEmpty
        title="Top cities"
        summary={`Cities with most alumni — ${summarise(data.topCities)}.`}
        data={data.topCities}
      >
        <BarChartH data={data.topCities} />
      </ChartOrEmpty>
      <ChartOrEmpty
        title="Top employers"
        summary={`Employers with most alumni — ${summarise(data.topEmployers)}.`}
        data={data.topEmployers}
      >
        <BarChartH data={data.topEmployers} />
      </ChartOrEmpty>
      <ChartOrEmpty
        title="Top sectors"
        summary={`Sectors with most alumni — ${summarise(data.topSectors)}.`}
        data={data.topSectors}
      >
        <BarChartH data={data.topSectors} />
      </ChartOrEmpty>
      <ChartOrEmpty
        title="Top districts"
        summary={`Districts with most alumni — ${summarise(data.topDistricts)}.`}
        data={data.topDistricts}
      >
        <BarChartH data={data.topDistricts} />
      </ChartOrEmpty>
    </div>
  );
}

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  const [range, setRange] = useState<TimeRange>("all");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        description="Aggregate counts across the alumni register — one cached query set."
        actions={
          <Select value={range} onValueChange={(v) => setRange(v as TimeRange)}>
            <SelectTrigger className="min-w-40" aria-label="Time range">
              <span className="flex-1 text-left">{RANGE_LABELS[range]}</span>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RANGE_LABELS) as TimeRange[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {RANGE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Alumni" value={data.totals.alumni} accent />
        <KpiCard label="Verified" value={data.totals.verified} />
        <KpiCard label="Under approval" value={data.totals.underApproval} />
        <KpiCard label="Rejected" value={data.totals.rejected} />
        <KpiCard label="E-cards issued" value={data.totals.ecardsIssued} />
        <KpiCard
          label="Pending requests"
          value={data.totals.changeRequestsPending}
        />
      </div>

      <AnalyticsCharts data={data} range={range} />
    </div>
  );
}
