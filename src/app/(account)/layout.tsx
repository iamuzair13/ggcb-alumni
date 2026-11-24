import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Token/account-link pages — same minimal card shell as (auth) but WITHOUT
 * the guest redirect: a signed-in user may still open verify/reset links
 * (spec §4.5).
 */
export default function AccountLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="mb-6 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Logo />
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader className="sr-only">
          <h1 className="sr-only">Account link</h1>
        </CardHeader>
        <CardContent className="pt-2">{children}</CardContent>
      </Card>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Government Postgraduate College Burewala (GGCB)
      </p>
    </main>
  );
}
