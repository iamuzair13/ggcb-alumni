import { notFound } from "next/navigation";
import { PublicDemoShell } from "@/components/demo/public-demo-shell";
import { VerifyView } from "@/features/ecard/views/verify-view";
import { world } from "@/features/_shared/fixtures/world";
import type { EcardVerifyResult } from "@/features/ecard/types";

export default function DemoPublicVerify() {
  if (process.env.NODE_ENV === "production") notFound();

  // Minimal payload only — the real page must never expose contact details
  // or record numbers (ecard/types.ts).
  const me = world.alumni.find((a) => a.verifyStatus === "verified")!;
  const result: EcardVerifyResult = {
    ok: true,
    name: me.fullName,
    department: me.departmentName,
    passingYear: me.passingYear,
    status: "active",
  };

  return (
    <PublicDemoShell
      title="Alumni card verification"
      description="What someone sees when they check an E-card link."
    >
      <VerifyView result={result} />
    </PublicDemoShell>
  );
}
