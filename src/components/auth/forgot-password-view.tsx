"use client";

/**
 * Forgot-password view — ALWAYS the same neutral confirmation (spec
 * §5.1): existence and rate-limiting are invisible by design.
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import type { ActionResult } from "@/lib/result";
import type { NeutralResult } from "@/lib/result";

export function ForgotPasswordView({
  action,
  initialState,
}: {
  action: (input: { email: string }) => Promise<ActionResult<NeutralResult>>;
  /** Previews only — renders the post-submit state directly. */
  initialState?: "idle" | "sent";
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(initialState === "sent");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      await action({ email });
      setSent(true); // neutral — same screen for every outcome
    });
  };

  if (sent) {
    return (
      <div className="space-y-5">
        <MailCheck
          className="mx-auto size-10 text-success"
          aria-hidden="true"
        />
        <div className="space-y-1 text-center">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground">
            If an account exists for that address, we have sent password reset
            instructions. The link is valid for 1 hour.
          </p>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Nothing arrived? Check spam, or try again in a few minutes.
        </p>
        <Button
          render={<Link href="/login" />}
          variant="outline"
          className="w-full"
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Reset your password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your account email and we will send a reset link if an account
          exists.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <FormField label="Email" required>
          {(id, describedBy) => (
            <Input
              id={id}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com…"
              aria-describedby={describedBy}
            />
          )}
        </FormField>
        <Button type="submit" className="w-full" loading={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
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
