import type { Metadata } from "next";
import { Suspense } from "react";

import { ChoosePasswordView } from "@/components/auth/choose-password-view";
import { TokenStrip } from "@/components/auth/token-strip";
import { resetPasswordAction } from "@/lib/actions/account";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage({
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
        action={resetPasswordAction}
        variant="reset"
      />
    </>
  );
}

function ChooseSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <Skeleton className="mx-auto h-6 w-52" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}
