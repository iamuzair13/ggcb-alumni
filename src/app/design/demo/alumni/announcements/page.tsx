import { notFound } from "next/navigation";
import {
  DemoAlumniShell,
  RequireDemoVerified,
} from "@/components/demo/demo-shells";
import { AnnouncementsView } from "@/features/announcements/views/announcements-view";
import { world } from "@/features/_shared/fixtures/world";

export default function DemoAlumniAnnouncements() {
  if (process.env.NODE_ENV === "production") notFound();

  // Published only; expiry filtering happens in the client view —
  // `new Date()` is not allowed in this prerendered server component.
  const announcements = world.announcements.filter((a) => a.isPublished);

  return (
    <DemoAlumniShell>
      <RequireDemoVerified>
        <AnnouncementsView announcements={announcements} />
      </RequireDemoVerified>
    </DemoAlumniShell>
  );
}
