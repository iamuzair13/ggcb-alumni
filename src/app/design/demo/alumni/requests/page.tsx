import { notFound } from "next/navigation";
import {
  DemoAlumniShell,
  RequireDemoVerified,
} from "@/components/demo/demo-shells";
import { RequestsView } from "@/features/profile/views/requests-view";
import { world } from "@/features/_shared/fixtures/world";
import type { AlumniChangeRequest } from "@/features/alumni-directory/types";

export default function DemoAlumniRequests() {
  if (process.env.NODE_ENV === "production") notFound();

  const me = world.alumni.find((a) => a.verifyStatus === "verified")!;

  // The world's random spread may give "me" few requests — craft one of
  // each status so reviewers always see all three states.
  const crafted: AlumniChangeRequest[] = [
    {
      id: "cr-demo-pending",
      alumniId: me.id,
      alumniName: me.fullName,
      rollNumber: me.rollNumber,
      changes: [
        {
          field: "passing_year",
          label: "Passing year",
          oldValue: String(me.passingYear - 1),
          newValue: String(me.passingYear),
        },
      ],
      status: "pending",
      reviewNote: null,
      createdAt: "2026-10-24",
      reviewedAt: null,
      reviewedBy: null,
    },
    {
      id: "cr-demo-approved",
      alumniId: me.id,
      alumniName: me.fullName,
      rollNumber: me.rollNumber,
      changes: [
        {
          field: "full_name",
          label: "Full name",
          oldValue: me.fullName.replace("Sample ", "Sample Old "),
          newValue: me.fullName,
        },
      ],
      status: "approved",
      reviewNote: null,
      createdAt: "2026-08-12",
      reviewedAt: "2026-08-30",
      reviewedBy: "Sample Staff A",
    },
    {
      id: "cr-demo-rejected",
      alumniId: me.id,
      alumniName: me.fullName,
      rollNumber: me.rollNumber,
      changes: [
        {
          field: "department",
          label: "Department",
          oldValue: "Sample Mathematics",
          newValue: me.departmentName,
        },
      ],
      status: "rejected",
      reviewNote: "Does not match college records.",
      createdAt: "2026-06-05",
      reviewedAt: "2026-06-18",
      reviewedBy: "Sample Staff A",
    },
  ];

  const requests = [
    ...crafted,
    ...world.changeRequests.filter((r) => r.alumniId === me.id),
  ];

  return (
    <DemoAlumniShell>
      <RequireDemoVerified>
        <RequestsView requests={requests} />
      </RequireDemoVerified>
    </DemoAlumniShell>
  );
}
