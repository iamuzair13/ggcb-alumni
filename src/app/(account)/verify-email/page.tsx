import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyEmailView } from "@/components/auth/verify-email-view";
import { TokenStrip } from "@/components/auth/token-strip";
import { verifyEmailAction } from "@/lib/actions/account";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false, follow: false },
};

/**
 * GET renders the confirm button ONLY — the token is consumed by the POST
 * server action, so mail-scanner prefetches can never spend it (spec §4.1).
 * searchParams is read inside Suspense (Cache Components).
 */
export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<VerifySkeleton />}>
      <VerifyInner searchParams={searchParams} />
    </Suspense>
  );
}

async function VerifyInner({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await searchParams;
  const raw = Array.isArray(token) ? token[0] : token;
  return (
    <>
      <TokenStrip />
      <VerifyEmailView token={raw ?? null} action={verifyEmailAction} />
    </>
  );
}

function VerifySkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <Skeleton className="mx-auto h-6 w-44" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}
