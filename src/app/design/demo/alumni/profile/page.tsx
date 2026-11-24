import { notFound } from "next/navigation";
import {
  DemoAlumniShell,
  RequireDemoVerified,
} from "@/components/demo/demo-shells";
import { ProfileView } from "@/features/profile/views/profile-view";
import { world } from "@/features/_shared/fixtures/world";

export default function DemoAlumniProfile() {
  if (process.env.NODE_ENV === "production") notFound();

  const me = world.alumni.find((a) => a.verifyStatus === "verified")!;
  const departments = world.departments
    .filter((d) => d.isActive)
    .map((d) => ({ id: d.id, name: d.name }));

  return (
    <DemoAlumniShell>
      <RequireDemoVerified>
        <ProfileView me={me} departments={departments} />
      </RequireDemoVerified>
    </DemoAlumniShell>
  );
}
