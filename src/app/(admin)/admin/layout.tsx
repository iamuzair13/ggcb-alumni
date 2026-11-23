import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdminBreadcrumb } from "@/components/layout/admin-breadcrumb";
import { AdminMobileNav, AdminSidebar } from "@/components/layout/admin-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/shared/logo";
import { SkipLink } from "@/components/shared/skip-link";
import { QueryProvider } from "@/providers/query-provider";
import { requireStaff } from "@/server/auth/session";
import { adminNavForRole } from "@/server/auth/nav";
import { ROLE_LABELS } from "@/lib/constants/roles";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Admin shell. Authorization runs in the AsyncShell inside Suspense —
 * requireStaff() is the security boundary (the nav filtering is cosmetic).
 */
export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <QueryProvider>
      <SkipLink />
      <Suspense>
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </QueryProvider>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await requireStaff({ callbackPath: "/admin" });
  const navItems = adminNavForRole(user.role);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <AdminMobileNav items={navItems} />
          <Link
            href="/admin"
            aria-label="Admin dashboard"
            className="shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Logo compact />
          </Link>
          <span className="font-heading text-base font-semibold tracking-tight">
            Admin
          </span>
          <div className="flex-1" />
          <div className="hidden items-center gap-3 sm:flex">
            <span className="text-right leading-tight">
              <span className="block text-xs font-medium">{user.name}</span>
              <span className="block text-[0.625rem] tracking-wide text-muted-foreground uppercase">
                {ROLE_LABELS[user.role]}
              </span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="flex">
        <AdminSidebar items={navItems} />
        <div className="min-w-0 flex-1">
          <div className="border-b bg-background px-4 py-3 sm:px-6 lg:px-8">
            <AdminBreadcrumb />
          </div>
          <main id="main-content" className="px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
