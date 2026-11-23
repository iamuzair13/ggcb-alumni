import type { Metadata } from "next";
import { UsersRound } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";
import { requireRole } from "@/server/auth/session";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  await requireRole(["superadmin"]);
  return (
    <PlaceholderPage
      title="Users"
      description="Staff user management and role assignment (superadmin)."
      icon={UsersRound}
    />
  );
}
