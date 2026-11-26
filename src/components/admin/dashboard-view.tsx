/**
 * Admin dashboard (read model) — KPI row, the alumni register itself, then
 * glanceable context (recent registrations, 6-month trend, register
 * health). The KPI row doubles as the register's navigation: every stat
 * links to the matching tab/filter below it.
 *
 * Read-only on purpose: approve/reject lands with the E-card slice; until
 * then every staff role sees the same truthful surface. A server
 * component — the interactive parts it composes (charts) are client islands.
 */
import Link from "next/link";
import { ArrowDown, ArrowUp, UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { AreaChartV, BarChartH, ChartCard } from "@/components/shared/charts";
import { CountUp } from "@/components/shared/count-up";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  departmentsTop,
  trendDelta,
} from "@/features/admin-dashboard/chart-data";
import type { AdminDashboardData } from "@/features/admin-dashboard/types";

type LedgerTone =
  "ink" | "primary" | "success" | "warning" | "destructive" | "accent" | "info";

/** Index-tab hue per cell — a real register's colored thumb tabs. */
const TONE_TAB: Record<LedgerTone, string> = {
  ink: "border-t-border",
  primary: "border-t-primary",
  success: "border-t-success-foreground",
  warning: "border-t-warning-foreground",
  destructive: "border-t-destructive",
  accent: "border-t-accent-foreground",
  info: "border-t-info-foreground",
};

/** Attention cells: full status tint + ink figure. */
const TONE_ACTIVE: Record<LedgerTone, string> = {
  ink: "",
  primary: "bg-primary/5 text-primary",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
  accent: "bg-accent text-accent-foreground",
  info: "bg-info text-info-foreground",
};

/** Idle-cell hover: the cell's own hue washes in. */
const TONE_HOVER: Record<LedgerTone, string> = {
  ink: "hover:bg-accent/50",
  primary: "hover:bg-primary/[0.07]",
  success: "hover:bg-success",
  warning: "hover:bg-warning",
  destructive: "hover:bg-destructive/10",
  accent: "hover:bg-accent",
  info: "hover:bg-info",
};

interface LedgerCell {
  label: string;
  value: number;
  href: string;
  tone: LedgerTone;
  /** Non-zero value should pull the eye — full status tint. */
  accent?: boolean;
  /** Period delta vs the prior month (real — from the trend series). */
  delta?: { delta: number; up: boolean; meaningful: boolean };
}

export function AdminDashboardView({
  data,
  register,
}: {
  data: AdminDashboardData;
  /** The live directory slice — rendered between stats and context. */
  register: React.ReactNode;
}) {
  const { kpis, recentRegistrations } = data;
  const trend = data.trend.map((t) => ({ label: t.month, value: t.count }));
  const delta = trendDelta(data.trend);
  const deptTop = departmentsTop();

  const ledger: LedgerCell[] = [
    {
      label: "Total alumni",
      value: kpis.totalAlumni,
      href: "/admin",
      tone: "primary",
      delta,
    },
    {
      label: "Verified",
      value: kpis.verified,
      href: "/admin?tab=verified",
      tone: "success",
    },
    {
      label: "Under approval",
      value: kpis.underApproval,
      href: "/admin?tab=under_approval",
      tone: "warning",
      accent: kpis.underApproval > 0,
    },
    {
      label: "Rejected",
      value: kpis.rejected,
      href: "/admin?tab=rejected",
      tone: "destructive",
    },
    {
      label: "Featured alumni",
      value: kpis.featured,
      href: "/admin?featured=1",
      tone: "accent",
    },
    {
      label: "Pending change requests",
      value: kpis.pendingChangeRequests,
      href: "/admin?tab=requests",
      tone: "info",
      accent: kpis.pendingChangeRequests > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="The alumni register at a glance — every number opens the matching list below."
      />

      {/* The ledger line — hairline-ruled cells, not cards. `gap-px` +
          `bg-border` lets the border colour be the rules themselves, so the
          ledger reads identically at every breakpoint. Each cell is a link:
          the numbers are the register's navigation. */}
      <nav aria-label="Register summary">
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 xl:grid-cols-6">
          {ledger.map((c, i) => (
            <li
              key={c.label}
              className="animate-reveal bg-card"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <Link
                href={c.href}
                className={cn(
                  "flex h-full flex-col justify-between gap-1 border-t-[3px] p-4 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
                  TONE_TAB[c.tone],
                  c.accent ? TONE_ACTIVE[c.tone] : TONE_HOVER[c.tone],
                )}
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {c.label}
                </span>
                <span className="tnum font-heading text-2xl font-semibold">
                  <CountUp value={c.value} />
                </span>
                {c.delta?.meaningful ? (
                  <span
                    className={cn(
                      "tnum mt-1 flex items-center gap-1 text-xs font-medium",
                      c.delta.up
                        ? "text-success-foreground"
                        : "text-destructive",
                    )}
                  >
                    {c.delta.up ? (
                      <ArrowUp className="size-3" aria-hidden="true" />
                    ) : (
                      <ArrowDown className="size-3" aria-hidden="true" />
                    )}
                    {Math.abs(c.delta.delta)} vs prior month
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="register-t" className="space-y-4">
        <h2 id="register-t" className="text-sm font-semibold">
          The register{" "}
          <span className="font-normal text-muted-foreground">
            ({kpis.totalAlumni} records)
          </span>
        </h2>
        {register}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 6-month trend — area + gradient, 2/3 of the row */}
        <section className="min-w-0 lg:col-span-2" aria-labelledby="trend-t">
          <ChartCard
            title="Registrations — last 6 months"
            summary={`Registrations by month: ${data.trend
              .map((t) => `${t.month} ${t.count}`)
              .join(", ")}.`}
            headers={["Month", "Registrations"]}
            rows={data.trend.map((t) => [t.month, t.count])}
            height={180}
          >
            <AreaChartV data={trend} />
          </ChartCard>
        </section>

        {/* Recent registrations — the human-readable feed */}
        <section className="min-w-0" aria-labelledby="recent-t">
          <Card className="h-full p-4">
            <h2
              id="recent-t"
              className="flex items-center gap-2 text-sm font-semibold"
            >
              <UserPlus className="size-4 text-primary" aria-hidden="true" />
              Recent registrations
            </h2>
            {recentRegistrations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No records yet —{" "}
                <Link
                  href="/admin/import-export"
                  className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  import the alumni list
                </Link>{" "}
                to start the register.
              </p>
            ) : (
              <ul className="mt-2 divide-y">
                {recentRegistrations.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {a.fullName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="font-mono">{a.rollNumber}</span>
                        {" · "}
                        {a.departmentName}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "shrink-0 capitalize",
                        a.datasource === "registration" &&
                          "bg-primary/10 text-primary",
                      )}
                    >
                      {a.datasource}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* Top-N departments — mock until a grouped count query lands.
            Full-width leaderboard on its own row. */}
        <section className="min-w-0 lg:col-span-3" aria-labelledby="dept-t">
          <ChartCard
            title="Alumni by department"
            summary={`Top departments by alumni: ${deptTop.data
              .map((d) => `${d.label} ${d.value}`)
              .join(", ")}.`}
            headers={["Department", "Alumni"]}
            rows={deptTop.data.map((d) => [d.label, d.value])}
            height={180}
          >
            <BarChartH data={deptTop.data} />
          </ChartCard>
          {deptTop.mock ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Sample figures — the per-department count query isn&apos;t wired
              yet.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
