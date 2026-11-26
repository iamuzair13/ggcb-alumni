import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { LoginHero } from "@/components/auth/login-hero";
import { sanitizeCallbackUrl } from "@/server/auth/callback-url";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Sign-in — same split-screen desk as /register: returning-member hero on
 * the left, the credentials card on the right. Form logic is untouched;
 * callbackUrl is validated server-side (never an open redirect).
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="grid flex-1 lg:grid-cols-[2fr_3fr]">
      <LoginHero />
      <section className="px-5 py-8 sm:px-10 lg:py-12">
        <div className="mx-auto w-full max-w-xl space-y-5">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Sign in
            </h1>
            <p className="text-sm text-muted-foreground">
              Alumni and staff sign in with their email and password.
            </p>
          </div>
          <div className="login-scope rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <Suspense>
              <LoginFormSuspense searchParams={searchParams} />
            </Suspense>
          </div>
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
      </section>
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
  const notice =
    sp.notice === "password-changed" ? "password-changed" : undefined;
  return <LoginForm callbackUrl={callbackUrl} notice={notice} />;
}
