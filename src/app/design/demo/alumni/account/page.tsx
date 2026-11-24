import { notFound } from "next/navigation";
import { DemoAlumniShell } from "@/components/demo/demo-shells";
import { AccountView } from "@/features/account/views/account-view";
import { world } from "@/features/_shared/fixtures/world";

export default function DemoAlumniAccount() {
  if (process.env.NODE_ENV === "production") notFound();

  // Account is reachable for every alumni persona (verified or not).
  const me = world.alumni.find((a) => a.verifyStatus === "verified")!;

  return (
    <DemoAlumniShell>
      <AccountView email={me.email} />
    </DemoAlumniShell>
  );
}
