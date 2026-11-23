import type { Metadata } from "next";
import Link from "next/link";

import { AdminBreadcrumb } from "@/components/layout/admin-breadcrumb";
import { AdminMobileNav, AdminSidebar } from "@/components/layout/admin-nav";
import { Logo } from "@/components/shared/logo";
import { SkipLink } from "@/components/shared/skip-link";
import { QueryProvider } from "@/providers/query-provider";

// TODO(prompt-03): this layout is an UNPROTECTED placeholder. Prompt 3 adds
// the authorization guard (requireRole('superadmin' | 'admin' | 'viewer')) —
// no real data may render here until then. noindex: staff area, never crawled.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <QueryProvider>
      <SkipLink />
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <AdminMobileNav />
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
          <span className="text-xs text-muted-foreground">
            GGCB Alumni Portal
          </span>
        </div>
      </header>
      <div className="flex">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <div className="border-b bg-background px-4 py-3 sm:px-6 lg:px-8">
            <AdminBreadcrumb />
          </div>
          <main id="main-content" className="px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </QueryProvider>
  );
}
