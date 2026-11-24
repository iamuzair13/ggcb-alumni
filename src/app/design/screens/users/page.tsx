import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import {
  InviteStaffButton,
  UsersView,
  type StaffUserRow,
} from "@/components/admin/users-view";

export const metadata: Metadata = {
  title: "Preview — staff users",
  robots: { index: false, follow: false },
};

const ROWS: StaffUserRow[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Sample Staff A",
    email: "staff-a@example.invalid",
    role: "superadmin",
    status: "active",
    lastLoginAt: "2026-03-10T09:30:00.000Z",
    createdAt: "2026-01-05T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Sample Staff B",
    email: "staff-b@example.invalid",
    role: "admin",
    status: "active",
    lastLoginAt: null,
    createdAt: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Sample Staff C",
    email: "staff-c@example.invalid",
    role: "viewer",
    status: "invited",
    lastLoginAt: null,
    createdAt: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    name: "Sample Staff D",
    email: "staff-d@example.invalid",
    role: "admin",
    status: "inactive",
    lastLoginAt: "2026-01-15T12:00:00.000Z",
    createdAt: "2025-12-20T00:00:00.000Z",
  },
];

/** Dev-only preview of /admin/users states (blueprint §2). */
export default function UsersScreensPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <main className="mx-auto max-w-6xl space-y-12 px-4 py-10">
        <section className="space-y-6">
          <h2 className="font-mono text-xs text-muted-foreground">
            Populated — superadmin, EMAIL_MODE=off banner, last-superadmin lock
          </h2>
          <PageHeader
            title="Staff users"
            description="Invite staff, assign roles, and manage access."
            actions={<InviteStaffButton />}
          />
          <UsersView
            rows={ROWS}
            currentUserId={ROWS[0].id}
            activeSuperadmins={1}
            emailMode="off"
          />
        </section>
        <section className="space-y-6">
          <h2 className="font-mono text-xs text-muted-foreground">
            Empty state + log banner
          </h2>
          <PageHeader
            title="Staff users"
            description="Invite staff, assign roles, and manage access."
          />
          <UsersView
            rows={[]}
            currentUserId={ROWS[0].id}
            activeSuperadmins={2}
            emailMode="log"
          />
        </section>
      </main>
    </Suspense>
  );
}
