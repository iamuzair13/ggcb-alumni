import { notFound } from "next/navigation";
import { DemoAdminShell } from "@/components/demo/demo-shells";
import { ContentView } from "@/features/content-admin/views/content-view";
import { contentAdminFixture } from "@/features/content-admin/fixtures";
import type { FeaturedEntry } from "@/features/content-admin/types";

/** Dev-only prototype of /admin/content — deterministic fixtures only. */
export default function DemoAdminContent() {
  if (process.env.NODE_ENV === "production") notFound();

  const fixture = contentAdminFixture();
  const featured: FeaturedEntry[] = fixture.featured.map((a, i) => ({
    alumniId: a.id,
    name: a.fullName,
    department: a.departmentName,
    achievement: a.achievement ?? "",
    order: i + 1,
  }));
  // The featured picker pool = all verified alumni (featured + candidates).
  const verifiedAlumni = [...fixture.featured, ...fixture.candidates];

  return (
    <DemoAdminShell>
      <ContentView
        events={fixture.events}
        announcements={fixture.announcements}
        opportunities={fixture.opportunities}
        stories={fixture.stories}
        featured={featured}
        verifiedAlumni={verifiedAlumni}
      />
    </DemoAdminShell>
  );
}
