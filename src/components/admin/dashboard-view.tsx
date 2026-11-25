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
import { UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { BarChartV, ChartCard } from "@/components/shared/charts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AdminDashboardData } from "@/features/admin-dashboard/types";

interface LedgerCell {
  label: string;
  value: number;
  href: string;
  /** Non-zero value should pull the eye — attention state. */
  accent?: boolean;
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

  const ledger: LedgerCell[] = [
    { label: "Total alumni", value: kpis.totalAlumni, href: "/admin" },
    { label: "Verified", value: kpis.verified, href: "/admin?tab=verified" },
    {
      label: "Under approval",
      value: kpis.underApproval,
      href: "/admin?tab=under_approval",
      accent: kpis.underApproval > 0,
    },
    { label: "Rejected", value: kpis.rejected, href: "/admin?tab=rejected" },
    {
      label: "Featured alumni",
      value: kpis.featured,
      href: "/admin?featured=1",
    },
    {
      label: "Pending change requests",
      value: kpis.pendingChangeRequests,
      href: "/admin?tab=requests",
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
          {ledger.map((c) => (
            <li key={c.label} className="bg-card">
              <Link
                href={c.href}
                className={cn(
                  "flex h-full flex-col justify-between gap-1 p-4 transition-colors outline-none hover:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
                  c.accent && "bg-primary/[0.04]",
                )}
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {c.label}
                </span>
                <span
                  className={cn(
                    "tnum font-heading text-2xl font-semibold",
                    c.accent && "text-primary",
                  )}
                >
                  {c.value}
                </span>
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

        {/* 6-month trend — wider now that it's one of two context cards */}
        <section className="min-w-0 lg:col-span-2" aria-labelledby="trend-t">
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
      </div>
    </div>
  );
}
