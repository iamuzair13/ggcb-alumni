import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// TODO(prompt-03): Prompt 3 adds real auth screens — these placeholders must
// never be indexed (they are unprotected shells with no behaviour).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: LayoutProps<"/">) {
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
          <h1 className="sr-only">Account access</h1>
        </CardHeader>
        <CardContent className="pt-2">{children}</CardContent>
      </Card>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Government Postgraduate College Burewala (GGCB)
      </p>
    </main>
  );
}
