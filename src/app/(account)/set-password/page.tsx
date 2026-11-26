import type { Metadata } from "next";
import { Suspense } from "react";

import { ChoosePasswordView } from "@/components/auth/choose-password-view";
import { TokenStrip } from "@/components/auth/token-strip";
import { setPasswordAction } from "@/lib/actions/account";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Set your password",
  robots: { index: false, follow: false },
};

export default function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<ChooseSkeleton />}>
      <Inner searchParams={searchParams} />
    </Suspense>
  );
}

async function Inner({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await searchParams;
  const raw = Array.isArray(token) ? token[0] : token;
  return (
    <>
      <TokenStrip />
      <ChoosePasswordView
        token={raw ?? null}
        action={setPasswordAction}
        variant="invite"
      />
    </>
  );
}

function ChooseSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <Skeleton className="mx-auto h-6 w-44" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}
