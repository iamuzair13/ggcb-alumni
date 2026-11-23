import type { Metadata } from "next";
import Link from "next/link";

import {
  AlumniDesktopNav,
  AlumniMobileNav,
} from "@/components/layout/alumni-nav";
import { Logo } from "@/components/shared/logo";
import { SkipLink } from "@/components/shared/skip-link";
import { QueryProvider } from "@/providers/query-provider";

// TODO(prompt-03): this layout is an UNPROTECTED placeholder. Prompt 3 adds
// the authorization guard (requireRole('alumni')) — no real data may render
// here until then. noindex because these routes must not be crawled.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AlumniLayout({ children }: LayoutProps<"/">) {
  return (
    <QueryProvider>
      <SkipLink />
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <AlumniMobileNav />
          <Link
            href="/dashboard"
            className="shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Logo />
          </Link>
          <div className="flex-1" />
          <AlumniDesktopNav />
        </div>
      </header>
      <main id="main-content" className="flex-1">
        {children}
      </main>
    </QueryProvider>
  );
}
