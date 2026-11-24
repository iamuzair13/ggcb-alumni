import { notFound } from "next/navigation";
import {
  DemoAlumniShell,
  RequireDemoVerified,
} from "@/components/demo/demo-shells";
import { AlumniEcardView } from "@/features/ecard/views/ecard-view";
import { world } from "@/features/_shared/fixtures/world";
import type { EcardView } from "@/features/ecard/types";

export default function DemoAlumniEcard() {
  if (process.env.NODE_ENV === "production") notFound();

  // Pick a verified alumnus whose card is active so the default state is
  // the normal one — the view's selector shows the other states anyway.
  const me = world.alumni.find(
    (a) =>
      a.verifyStatus === "verified" &&
      world.ecards.some((c) => c.alumniId === a.id && c.status === "active"),
  )!;

  const data: EcardView = {
    alumnus: me,
    card: world.ecards.find((c) => c.alumniId === me.id) ?? null,
  };

  return (
    <DemoAlumniShell>
      <RequireDemoVerified>
        <AlumniEcardView data={data} />
      </RequireDemoVerified>
    </DemoAlumniShell>
  );
}
