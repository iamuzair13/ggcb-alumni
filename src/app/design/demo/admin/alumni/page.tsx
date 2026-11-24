import { notFound } from "next/navigation";
import { DemoAdminShell } from "@/components/demo/demo-shells";
import { AlumniDirectoryView } from "@/features/alumni-directory/views/directory-view";
import { world } from "@/features/_shared/fixtures/world";

/** Dev-only admin alumni directory over the fixture world. */
export default async function DemoAdminAlumniPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { tab } = await searchParams;
  const initialTab = Array.isArray(tab) ? tab[0] : tab;

  return (
    <DemoAdminShell>
      <AlumniDirectoryView
        alumni={world.alumni}
        changeRequests={world.changeRequests}
        departments={world.departments}
        initialTab={initialTab}
      />
    </DemoAdminShell>
  );
}
