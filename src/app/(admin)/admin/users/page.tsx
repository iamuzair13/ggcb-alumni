import type { Metadata } from "next";
import { UsersRound } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <PlaceholderPage
      title="Users"
      description="Staff user management and role assignment (superadmin)."
      icon={UsersRound}
    />
  );
}
