import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Logo } from "@/components/shared/logo";
import { GuestRedirect } from "@/components/auth/guest-redirect";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Onboarding chrome for /register — full-width, not the small auth card.
 * A signed-in user is bounced to their role home by GuestRedirect.
 */
export default function OnboardLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
      </header>
      <div className="flex flex-1">
        <Suspense>
          <GuestRedirect>{children}</GuestRedirect>
        </Suspense>
      </div>
      <footer className="px-5 pb-4 text-center text-xs text-muted-foreground">
        Government Postgraduate College Burewala (GGCB)
      </footer>
    </main>
  );
}
