import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Static form skeleton only — submit behaviour is wired in a later phase
 * (Prompt 3, credentials login via NextAuth). No <form> element on purpose:
 * nothing may submit anywhere.
 */
export default function LoginPage() {
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
      <div className="space-y-4">
        <FormField label="Email" required>
          {(id, describedBy) => (
            <Input
              id={id}
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="you@example.com…"
              aria-describedby={describedBy}
            />
          )}
        </FormField>
        <FormField label="Password" required>
          {(id, describedBy) => (
            <Input
              id={id}
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Your password…"
              aria-describedby={describedBy}
            />
          )}
        </FormField>
        <Button className="w-full" disabled>
          Sign in
        </Button>
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
  );
}
