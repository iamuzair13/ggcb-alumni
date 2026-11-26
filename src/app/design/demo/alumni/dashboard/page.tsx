import { notFound } from "next/navigation";
import { DemoAlumniShell } from "@/components/demo/demo-shells";
import { AlumniDashboardView } from "@/features/alumni-dashboard/views/dashboard-view";
import { world } from "@/features/_shared/fixtures/world";
import type { AlumniDashboardData } from "@/features/alumni-dashboard/types";

export default function DemoAlumniDashboard() {
  if (process.env.NODE_ENV === "production") notFound();

  const verified = world.alumni.find((a) => a.verifyStatus === "verified")!;
  const pending = world.alumni.find(
    (a) => a.verifyStatus === "under_approval",
  )!;
  const rejected = world.alumni.find((a) => a.verifyStatus === "rejected")!;
  const data: AlumniDashboardData & {
    mePending: typeof verified;
    meRejected: typeof verified;
  } = {
    me: verified,
    mePending: pending,
    meRejected: rejected,
    ecard: world.ecards.find((c) => c.alumniId === verified.id) ?? null,
    completeness: {
      percent: 62,
      missing: ["a photo", "your employer", "a short bio"],
    },
    upcomingEvents: world.events.filter((e) => e.isPublished).slice(0, 3),
    latestAnnouncements: world.announcements
      .filter((a) => a.isPublished)
      .slice(0, 3),
    openOpportunities: world.opportunities
      .filter((o) => o.isPublished)
      .slice(0, 3),
    featuredStory: world.stories.find((s) => s.status === "approved") ?? null,
  };

  return (
    <DemoAlumniShell>
      <AlumniDashboardView data={data} />
    </DemoAlumniShell>
  );
}
