import type { Metadata } from "next";
import Link from "next/link";

import {
  AlumniDesktopNav,
  AlumniMobileNav,
} from "@/components/layout/alumni-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/shared/logo";
import { SkipLink } from "@/components/shared/skip-link";
import { QueryProvider } from "@/providers/query-provider";
import { requireRole, type SessionUser } from "@/server/auth/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Guard runs outside Suspense (real 403/307) → this route is blocking by
// definition; there is no instant shell to stream.
export const instant = false;

/**
 * Alumni shell — requireRole(['alumni']) is the security boundary, awaited
 * OUTSIDE Suspense so redirect()/forbidden() are real HTTP statuses (a
 * streamed fallback can't set 403/307). Protected pages are inherently
 * dynamic — there is no shared static shell worth prerendering.
 */
export default async function AlumniLayout({ children }: LayoutProps<"/">) {
  const user = await requireRole(["alumni"], { callbackPath: "/dashboard" });
  return (
    <QueryProvider>
      <SkipLink />
      <AlumniShell user={user}>{children}</AlumniShell>
    </QueryProvider>
  );
}

function AlumniShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <>
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
          <div className="hidden items-center gap-3 sm:flex">
            <span className="text-xs font-medium">{user.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main id="main-content" className="flex-1">
        {children}
      </main>
    </>
  );
}
