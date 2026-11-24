import { notFound } from "next/navigation";
import { DemoAdminShell } from "@/components/demo/demo-shells";
import { UsersDemoView } from "@/features/admin-dashboard/views/users-demo-view";
import type { StaffUserRow } from "@/components/admin/users-view";

/**
 * Dev-only staff-users screen. The fixture world has no staff accounts,
 * so a small deterministic set lives here (same style as world data —
 * "Sample Staff" names, example.invalid addresses).
 */
const ROWS: StaffUserRow[] = [
  {
    id: "staff-1",
    name: "Sample Staff A",
    email: "staff-a@example.invalid",
    role: "superadmin",
    status: "active",
    lastLoginAt: "2026-03-10T09:30:00.000Z",
    createdAt: "2026-01-05T00:00:00.000Z",
  },
  {
    id: "staff-2",
    name: "Sample Staff B",
    email: "staff-b@example.invalid",
    role: "admin",
    status: "active",
    lastLoginAt: "2026-03-11T14:05:00.000Z",
    createdAt: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "staff-3",
    name: "Sample Staff C",
    email: "staff-c@example.invalid",
    role: "viewer",
    status: "invited",
    lastLoginAt: null,
    createdAt: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "staff-4",
    name: "Sample Staff D",
    email: "staff-d@example.invalid",
    role: "admin",
    status: "inactive",
    lastLoginAt: "2026-01-15T12:00:00.000Z",
    createdAt: "2025-12-20T00:00:00.000Z",
  },
];

export default function DemoAdminUsersPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <DemoAdminShell>
      <UsersDemoView rows={ROWS} currentUserId="staff-1" emailMode="off" />
    </DemoAdminShell>
  );
}
