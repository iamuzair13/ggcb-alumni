import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { sanitizeCallbackUrl } from "@/server/auth/callback-url";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Real credentials sign-in (Prompt 3). The form posts to a server action
 * (NextAuth Credentials); callbackUrl is validated server-side so it can
 * never be an open redirect. searchParams is read inside Suspense
 * (Cache Components requires URL data to be streamed or blocking).
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Sign in
        </h1>
        <p className="text-sm text-muted-foreground">
          Alumni and staff sign in with their email and password.
        </p>
      </div>
      <Suspense>
        <LoginFormSuspense searchParams={searchParams} />
      </Suspense>
      <div className="flex flex-col items-center gap-1.5 text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          Forgot your password?
        </Link>
        <p className="text-muted-foreground">
          New alumnus?{" "}
          <Link
            href="/register"
            className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

async function LoginFormSuspense({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(
    Array.isArray(sp.callbackUrl) ? sp.callbackUrl[0] : sp.callbackUrl,
    "",
  );
  return <LoginForm callbackUrl={callbackUrl} />;
}
