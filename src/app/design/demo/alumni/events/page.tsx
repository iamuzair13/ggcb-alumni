import { notFound } from "next/navigation";
import {
  DemoAlumniShell,
  RequireDemoVerified,
} from "@/components/demo/demo-shells";
import { EventsView } from "@/features/events/views/events-view";
import { world } from "@/features/_shared/fixtures/world";

export default function DemoAlumniEvents() {
  if (process.env.NODE_ENV === "production") notFound();

  const events = world.events.filter((e) => e.isPublished);

  return (
    <DemoAlumniShell>
      <RequireDemoVerified>
        <EventsView events={events} />
      </RequireDemoVerified>
    </DemoAlumniShell>
  );
}
