import Link from "next/link";
import { notFound } from "next/navigation";
import { UserSearch } from "lucide-react";

import { DemoAdminShell } from "@/components/demo/demo-shells";
import { AlumnusRecordView } from "@/features/alumni-directory/views/record-view";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { world } from "@/features/_shared/fixtures/world";

/** Dev-only admin record page over the fixture world. */
export default async function DemoAdminAlumnusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { id } = await params;

  const alumnus = world.alumni.find((a) => a.id === id);

  return (
    <DemoAdminShell>
      {alumnus ? (
        <AlumnusRecordView
          alumnus={alumnus}
          ecard={world.ecards.find((c) => c.alumniId === alumnus.id) ?? null}
          pendingRequest={
            world.changeRequests.find(
              (r) => r.alumniId === alumnus.id && r.status === "pending",
            ) ?? null
          }
        />
      ) : (
        <div className="py-16">
          <EmptyState
            icon={UserSearch}
            title="Record not found"
            description={`No fixture alumnus has the id “${id}”. It may have been a typo — the directory has the full register.`}
            action={
              <Button
                variant="outline"
                render={<Link href="/design/demo/admin/alumni" />}
              >
                Back to directory
              </Button>
            }
          />
        </div>
      )}
    </DemoAdminShell>
  );
}
