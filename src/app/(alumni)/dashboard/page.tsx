import type { Metadata } from "next";
import { Inbox } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Dashboard" };

export default function AlumniDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Alumni dashboard"
        description="Your profile, E-card, and alumni activity will appear here."
      />
      <EmptyState
        icon={Inbox}
        title="Nothing here yet"
        description="This area is being built. Once your registration is verified, your profile summary, E-card, and alumni content will show up here."
      />
    </div>
  );
}
