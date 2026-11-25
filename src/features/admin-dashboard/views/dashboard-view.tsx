"use client";

/**
 * Admin dashboard (demo) — KPI row, pending-approvals queue with quick
 * decisions, recent registrations and a 6-month registration trend.
 * Decisions are local state only: simulate() fakes the round-trip.
 */
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  CircleCheck,
  CircleX,
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DemoForbidden } from "@/components/demo/demo-shells";
import { useDemo } from "@/components/demo/demo-provider";
import { adminRouteAllowed } from "@/features/_shared/personas";
import { RejectReasonDialog } from "@/features/alumni-directory/views/reject-reason-dialog";
import type { AdminDashboardData, DashboardAlumnus } from "../types";

const DEMO_BASE = "/design/demo";

type Decision = { status: "verified" | "rejected"; reason?: string };

export function AdminDashboardView({ data }: { data: AdminDashboardData }) {
  const { persona, simulate } = useDemo();
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DashboardAlumnus | null>(
    null,
  );

  if (!adminRouteAllowed(persona, "/admin")) return <DemoForbidden />;
  const canMutate = persona.role === "admin" || persona.role === "superadmin";

  const approved = Object.values(decisions).filter(
    (d) => d.status === "verified",
  ).length;
  const rejected = Object.values(decisions).filter(
    (d) => d.status === "rejected",
  ).length;
  const kpis = {
    ...data.kpis,
    verified: data.kpis.verified + approved,
    rejected: data.kpis.rejected + rejected,
    underApproval: data.kpis.underApproval - approved - rejected,
  };
  const queue = data.pendingQueue.filter((a) => !decisions[a.id]);

  async function approve(a: DashboardAlumnus) {
    setBusyId(a.id);
    await simulate(null, 500);
    setDecisions((d) => ({ ...d, [a.id]: { status: "verified" } }));
    setBusyId(null);
    toast.success(`${a.fullName} approved`);
  }

  async function reject(a: DashboardAlumnus, reason: string) {
    setBusyId(a.id);
    await simulate(null, 550);
    setDecisions((d) => ({ ...d, [a.id]: { status: "rejected", reason } }));
    setBusyId(null);
    setRejectTarget(null);
    toast.success(`${a.fullName} rejected`);
  }

  const trend = data.trend.map((t) => ({ label: t.month, value: t.count }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="The alumni register at a glance — approvals, sign-ups and cards."
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
        <KpiCard label="E-cards issued" value={kpis.ecardsIssued} />
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
                href={`${DEMO_BASE}/admin/alumni?tab=under_approval`}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                Open directory
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </div>
            {queue.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                The queue is clear — no registrations are waiting.
              </p>
            ) : (
              <ul className="mt-2 divide-y">
                {queue.map((a) => (
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
                        {" · "}
                        {a.passingYear}
                      </p>
                    </div>
                    {canMutate ? (
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          loading={busyId === a.id}
                          disabled={busyId !== null}
                          onClick={() => approve(a)}
                        >
                          <CircleCheck
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId !== null}
                          onClick={() => setRejectTarget(a)}
                        >
                          <CircleX
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <StatusBadge status={a.verifyStatus} />
                    )}
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
              <ul className="mt-2 divide-y">
                {data.recentRegistrations.map((a) => (
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

          {/* Quick counts */}
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
                    href={`${DEMO_BASE}/admin/alumni?tab=requests`}
                    className="tnum font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
                  >
                    {kpis.pendingChangeRequests}
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

      {rejectTarget ? (
        <RejectReasonDialog
          open
          onOpenChange={(o) => !o && setRejectTarget(null)}
          title={`Reject ${rejectTarget.fullName}?`}
          description={
            <>
              Roll number{" "}
              <span className="font-mono">{rejectTarget.rollNumber}</span> — the
              alumnus sees this reason on their dashboard.
            </>
          }
          confirmLabel={`Reject ${rejectTarget.fullName}`}
          pending={busyId === rejectTarget.id}
          onSubmit={(reason) => reject(rejectTarget, reason)}
        />
      ) : null}
    </div>
  );
}
