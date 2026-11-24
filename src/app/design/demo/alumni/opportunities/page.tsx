import { notFound } from "next/navigation";
import {
  DemoAlumniShell,
  RequireDemoVerified,
} from "@/components/demo/demo-shells";
import { OpportunitiesView } from "@/features/opportunities/views/opportunities-view";
import { world } from "@/features/_shared/fixtures/world";

export default function DemoAlumniOpportunities() {
  if (process.env.NODE_ENV === "production") notFound();

  const opportunities = world.opportunities.filter((o) => o.isPublished);

  return (
    <DemoAlumniShell>
      <RequireDemoVerified>
        <OpportunitiesView opportunities={opportunities} />
      </RequireDemoVerified>
    </DemoAlumniShell>
  );
}
