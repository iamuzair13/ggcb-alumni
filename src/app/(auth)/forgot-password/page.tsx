import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

export const metadata: Metadata = { title: "Reset password" };

/**
 * Static form skeleton only — reset-token email flow is wired in a later
 * phase. No <form> element on purpose.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Reset your password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your account email and we will send a reset link.
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
        <Button className="w-full" disabled>
          Send reset link
        </Button>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/login"
          className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
