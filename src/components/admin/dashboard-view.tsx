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
import {
  CircleStar,
  FileEdit,
  IdCard,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { BarChartV, ChartCard } from "@/components/shared/charts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AdminDashboardData } from "@/features/admin-dashboard/types";

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="The alumni register at a glance — every number opens the matching list below."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total alumni" value={kpis.totalAlumni} href="/admin" />
        <KpiCard
          label="Verified"
          value={kpis.verified}
          href="/admin?tab=verified"
        />
        <KpiCard
          label="Under approval"
          value={kpis.underApproval}
          accent={kpis.underApproval > 0}
          href="/admin?tab=under_approval"
        />
        <KpiCard
          label="Rejected"
          value={kpis.rejected}
          href="/admin?tab=rejected"
        />
        <KpiCard
          label="Featured alumni"
          value={kpis.featured}
          href="/admin?featured=1"
        />
        <KpiCard
          label="Pending change requests"
          value={kpis.pendingChangeRequests}
          accent={kpis.pendingChangeRequests > 0}
          href="/admin?tab=requests"
        />
      </div>

      <section aria-labelledby="register-t" className="space-y-4">
        <h2 id="register-t" className="text-sm font-semibold">
          The register
        </h2>
        {register}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent registrations */}
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
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {a.datasource}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* 6-month trend */}
        <section className="min-w-0" aria-labelledby="trend-t">
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
        <section className="min-w-0" aria-labelledby="quick-t">
          <Card className="h-full p-4">
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
                  href="/admin?tab=requests"
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
  );
}
