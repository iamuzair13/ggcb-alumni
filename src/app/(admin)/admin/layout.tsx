import type { Metadata } from "next";
import Link from "next/link";

import { AdminBreadcrumb } from "@/components/layout/admin-breadcrumb";
import { AdminMobileNav, AdminSidebar } from "@/components/layout/admin-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/shared/logo";
import { SkipLink } from "@/components/shared/skip-link";
import { QueryProvider } from "@/providers/query-provider";
import { requireStaff, type SessionUser } from "@/server/auth/session";
import { adminNavForRole } from "@/server/auth/nav";
import { ROLE_LABELS } from "@/lib/constants/roles";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Admin shell — requireStaff() is the security boundary, awaited OUTSIDE
 * Suspense so redirect()/forbidden() produce real HTTP statuses (a
 * streamed fallback can't set 403/307). Page-level guards (e.g.
 * requireRole(['superadmin'])) benefit the same way. Protected pages are
 * inherently dynamic — no shared static shell to prerender.
 */
export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const user = await requireStaff({ callbackPath: "/admin" });
  return (
    <QueryProvider>
      <SkipLink />
      <AdminShell user={user}>{children}</AdminShell>
    </QueryProvider>
  );
}

function AdminShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const navHrefs = adminNavForRole(user.role);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <AdminMobileNav hrefs={navHrefs} />
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
        <AdminSidebar hrefs={navHrefs} />
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
