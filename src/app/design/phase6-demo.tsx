"use client";

/** Phase-6 component demos — client islands on the (dev-only) design page. */
import { useState } from "react";
import {
  BarChartH,
  BarChartV,
  ChartCard,
  DonutChart,
  LineChart,
} from "@/components/shared/charts";
import { CalendarGrid } from "@/components/shared/calendar-grid";
import { Stepper } from "@/components/shared/stepper";
import { DropZone } from "@/components/shared/drop-zone";
import { CompletenessMeter } from "@/components/shared/completeness-meter";
import { DiffTable } from "@/components/shared/diff-table";
import { DeadlineBadge } from "@/components/shared/deadline-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { DateBlock } from "@/components/shared/date-block";

// Module-scope snapshot — demo data only, evaluated once at module init.
const DEMO_NOW = Date.now();
const DEMO_TODAY = new Date(DEMO_NOW).toISOString().slice(0, 10);
const demoDate = (days: number) =>
  new Date(DEMO_NOW + days * 864e5).toISOString().slice(0, 10);

export function ChartsDemo() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="BarChartH — horizontal bars"
        summary="Sample chart: three sample values."
        rows={[
          ["Sample A", 42],
          ["Sample B", 27],
          ["Sample C", 13],
        ]}
      >
        <BarChartH
          data={[
            { label: "Sample Dept A", value: 42 },
            { label: "Sample Dept B", value: 27 },
            { label: "Sample Dept C", value: 13 },
          ]}
        />
      </ChartCard>
      <ChartCard
        title="BarChartV — columns"
        summary="Sample chart: values by year."
        rows={[
          ["2023", 31],
          ["2024", 44],
          ["2025", 52],
        ]}
      >
        <BarChartV
          data={[
            { label: "2023", value: 31 },
            { label: "2024", value: 44 },
            { label: "2025", value: 52 },
          ]}
        />
      </ChartCard>
      <ChartCard
        title="LineChart — over time"
        summary="Sample trend over six months."
        rows={[
          ["Jun", 4],
          ["Jul", 9],
          ["Aug", 6],
          ["Sep", 12],
          ["Oct", 8],
          ["Nov", 15],
        ]}
      >
        <LineChart
          data={[
            { label: "Jun", value: 4 },
            { label: "Jul", value: 9 },
            { label: "Aug", value: 6 },
            { label: "Sep", value: 12 },
            { label: "Oct", value: 8 },
            { label: "Nov", value: 15 },
          ]}
        />
      </ChartCard>
      <ChartCard
        title="DonutChart — status split"
        summary="Sample status distribution."
        rows={[
          ["Verified", 96],
          ["Under approval", 30],
          ["Rejected", 14],
        ]}
      >
        <DonutChart
          data={[
            { label: "Verified", value: 96 },
            { label: "Under approval", value: 30 },
            { label: "Rejected", value: 14 },
          ]}
        />
      </ChartCard>
    </div>
  );
}

export function StepperDemo() {
  const [step, setStep] = useState(1);
  return (
    <div className="space-y-4">
      <Stepper
        steps={["Upload", "Map columns", "Validate", "Review", "Commit"]}
        current={step}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(4, s + 1))}
          className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function DropZoneDemo() {
  const [msg, setMsg] = useState("No file chosen yet.");
  return (
    <div className="max-w-md space-y-3">
      <DropZone
        accept=".xlsx,.csv"
        maxBytes={10 * 1024 * 1024}
        hint=".xlsx or .csv, up to 10 MB, up to 10,000 rows"
        onFile={(f, err) =>
          setMsg(
            err ??
              `Picked “${f?.name}” (${((f?.size ?? 0) / 1024).toFixed(0)} KB)`,
          )
        }
      />
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {msg}
      </p>
    </div>
  );
}

export function CalendarDemo() {
  return (
    <CalendarGrid
      events={[
        { id: "1", date: DEMO_TODAY, title: "Sample event today" },
        { id: "2", date: demoDate(3), title: "Sample reunion" },
        { id: "3", date: demoDate(9), title: "Sample talk" },
      ]}
    />
  );
}

export function DisplayBitsDemo() {
  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h3 className="mb-2 text-sm font-medium">
          KpiCard + DateBlock + DeadlineBadge
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          <KpiCard label="Sample KPI" value={132} hint="+12 this month" />
          <DateBlock iso="2026-11-14" />
          <DeadlineBadge deadline="2027-03-01" />
          <DeadlineBadge deadline={demoDate(5)} />
          <DeadlineBadge deadline="2020-01-01" />
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium">CompletenessMeter</h3>
        <CompletenessMeter
          percent={62}
          missing={["a photo", "your employer"]}
          className="max-w-md"
        />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium">
          DiffTable — change-request review
        </h3>
        <DiffTable
          changes={[
            {
              field: "name",
              label: "Full name",
              oldValue: "Sample Old Name",
              newValue: "Sample New Name",
            },
            {
              field: "year",
              label: "Passing year",
              oldValue: "2023",
              newValue: "2024",
            },
          ]}
        />
      </div>
    </div>
  );
}
