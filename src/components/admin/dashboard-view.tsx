/**
 * Admin dashboard (read model) — KPI row, pending-approvals queue, recent
 * registrations and a 6-month registration trend over live data.
 *
 * Read-only on purpose: quick approve/reject lands with the directory slice;
 * until then every staff role sees the same truthful surface. A server
 * component — the interactive parts it composes (charts) are client islands.
 */
import Link from "next/link";
import {
  ArrowRight,
  CircleStar,
  FileEdit,
  IdCard,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { BarChartV, ChartCard } from "@/components/shared/charts";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AdminDashboardData } from "@/features/admin-dashboard/types";

export function AdminDashboardView({ data }: { data: AdminDashboardData }) {
  const { kpis, pendingQueue, recentRegistrations } = data;
  const trend = data.trend.map((t) => ({ label: t.month, value: t.count }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="The alumni register at a glance — approvals, sign-ups and register health."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total alumni" value={kpis.totalAlumni} />
        <KpiCard label="Verified" value={kpis.verified} />
        <KpiCard
          label="Under approval"
          value={kpis.underApproval}
          accent={kpis.underApproval > 0}
        />
        <KpiCard label="Rejected" value={kpis.rejected} />
        <KpiCard label="Featured alumni" value={kpis.featured} />
        <KpiCard
          label="Pending change requests"
          value={kpis.pendingChangeRequests}
          accent={kpis.pendingChangeRequests > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pending approvals queue */}
        <section className="min-w-0 lg:col-span-2" aria-labelledby="queue-t">
          <Card className="h-full p-4">
            <div className="flex items-center justify-between gap-3">
              <h2
                id="queue-t"
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <UserCheck className="size-4 text-primary" aria-hidden="true" />
                Pending approvals
              </h2>
              <Link
                href="/admin/alumni?tab=under_approval"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                Open directory
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </div>
            {pendingQueue.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                The queue is clear — no registrations are waiting.
              </p>
            ) : (
              <ul className="mt-2 divide-y">
                {pendingQueue.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {a.fullName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="font-mono">{a.rollNumber}</span>
                        {" · "}
                        {a.departmentName}
                        {a.passingYear ? ` · ${a.passingYear}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={a.verifyStatus} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <div className="min-w-0 space-y-6">
          {/* Recent registrations */}
          <section aria-labelledby="recent-t">
            <Card className="p-4">
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
                        className="shrink-0 capitalize"
                      >
                        {a.datasource}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {/* 6-month trend */}
          <section aria-labelledby="trend-t">
            <ChartCard
              title="Registrations — last 6 months"
              summary={`Registrations by month: ${data.trend
                .map((t) => `${t.month} ${t.count}`)
                .join(", ")}.`}
              headers={["Month", "Registrations"]}
              rows={data.trend.map((t) => [t.month, t.count])}
              height={160}
            >
              <BarChartV data={trend} />
            </ChartCard>
          </section>

          {/* Register health */}
          <section aria-labelledby="quick-t">
            <Card className="p-4">
              <h2
                id="quick-t"
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <IdCard className="size-4 text-primary" aria-hidden="true" />
                Register health
              </h2>
              <ul className="mt-2 space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Users className="size-3.5" aria-hidden="true" />
                    Records on file
                  </span>
                  <span className="tnum font-medium">{kpis.totalAlumni}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <FileEdit className="size-3.5" aria-hidden="true" />
                    Change requests waiting
                  </span>
                  <Link
                    href="/admin/alumni?tab=requests"
                    className="tnum font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
                  >
                    {kpis.pendingChangeRequests}
                  </Link>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CircleStar className="size-3.5" aria-hidden="true" />
                    Featured alumni
                  </span>
                  <Link
                    href="/admin/content?tab=featured"
                    className="tnum font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
                  >
                    {kpis.featured}
                  </Link>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <UserX className="size-3.5" aria-hidden="true" />
                    Rejected records
                  </span>
                  <span className="tnum font-medium">{kpis.rejected}</span>
                </li>
              </ul>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
