"use client";

import { LogOut } from "lucide-react";

import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

/**
 * POST-based sign-out via the Auth.js server action — clears the session
 * cookie. Rendered inside the admin/alumni shells.
 */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sign out
      </button>
    </form>
  );
}
