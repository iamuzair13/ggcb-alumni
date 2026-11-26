import { notFound } from "next/navigation";
import {
  DemoAlumniShell,
  RequireDemoVerified,
} from "@/components/demo/demo-shells";
import { StoriesView } from "@/features/stories/views/stories-view";
import { world } from "@/features/_shared/fixtures/world";
import type { Story } from "@/features/stories/types";

export default function DemoAlumniStories() {
  if (process.env.NODE_ENV === "production") notFound();

  const me = world.alumni.find((a) => a.verifyStatus === "verified")!;

  const gallery = world.stories.filter((s) => s.status === "approved");

  // Craft one submission per status so "My submissions" shows all states.
  const mine: Story[] = [
    {
      id: "st-demo-pending",
      alumniId: me.id,
      alumniName: me.fullName,
      title: "What the debate society taught me",
      content:
        "Sample story — I nearly dropped out in my second year. A teacher noticed before anyone else did, and the debate society gave me a reason to stay.\n\nNow I coach students at the same table where I once sat.",
      imagePath: null,
      status: "pending",
      reviewNote: null,
      createdAt: "2026-10-20",
    },
    {
      id: "st-demo-rejected",
      alumniId: me.id,
      alumniName: me.fullName,
      title: "My first job interview",
      content:
        "Sample story — a short draft about interview day that needs the year and department named before staff can publish it.",
      imagePath: null,
      status: "rejected",
      reviewNote: "Please resubmit with the year and department named.",
      createdAt: "2026-09-02",
    },
    {
      id: "st-demo-approved",
      alumniId: me.id,
      alumniName: me.fullName,
      title: "Teaching where I was once a student",
      content:
        "Sample story — I came back to the district as a teacher. The classroom looks different from this side of the desk.",
      imagePath: null,
      status: "approved",
      reviewNote: null,
      createdAt: "2026-05-14",
    },
  ];

  return (
    <DemoAlumniShell>
      <RequireDemoVerified>
        <StoriesView stories={gallery} mine={mine} myName={me.fullName} />
      </RequireDemoVerified>
    </DemoAlumniShell>
  );
}
