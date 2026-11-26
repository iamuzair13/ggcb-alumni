import type { Metadata } from "next";
import { Clock4, Inbox, ShieldX } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { requireAlumni } from "@/server/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Alumni dashboard — reachable by alumni in ANY verify_status (the status
 * view). Verified-only features arrive in later phases behind
 * requireAlumni({ verified: true }).
 */
export default async function AlumniDashboardPage() {
  const user = await requireAlumni();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title={`Welcome, ${user.name}`}
        description="Your profile, E-card, and alumni activity will appear here."
      />
      {user.verifyStatus === "under_approval" ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <Clock4
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">
              Registration under review
            </p>
            <p className="mt-0.5 text-amber-800/90 dark:text-amber-200/80">
              The college is reviewing your registration. You&apos;ll be able to
              use alumni features once it is verified.
            </p>
          </div>
          <Badge variant="outline" className="ml-auto border-amber-500/50">
            Pending
          </Badge>
        </div>
      ) : null}
      {user.verifyStatus === "rejected" ? (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <ShieldX
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-destructive">
              Registration rejected
            </p>
            <p className="mt-0.5 text-destructive/80">
              Your registration was not approved. Contact the college if you
              believe this is a mistake.
            </p>
          </div>
        </div>
      ) : null}
      <EmptyState
        icon={Inbox}
        title="Nothing here yet"
        description="This area is being built. Once your registration is verified, your profile summary, E-card, and alumni content will show up here."
      />
    </div>
  );
}
