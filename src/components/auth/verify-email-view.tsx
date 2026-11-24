"use client";

/**
 * Verify-email view — the GET renders a confirm button ONLY (consuming a
 * token on GET would let mail scanners spend it). Invalid/expired/used all
 * collapse to one generic message (spec §4.1).
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import type { ActionResult } from "@/lib/result";
import type { ConsumeResult } from "@/lib/result";

export type TokenAction = (input: {
  token: string;
}) => Promise<ActionResult<ConsumeResult>>;

export function VerifyEmailView({
  token,
  action,
  initialState = "idle",
}: {
  token: string | null;
  action: TokenAction;
  /** Previews only — seeds a terminal state. */
  initialState?: "idle" | "success" | "invalid";
}) {
  const [state, setState] = useState<"idle" | "success" | "invalid">(
    initialState,
  );
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    if (!token) return;
    startTransition(async () => {
      const r = await action({ token });
      if (r.ok && r.data.status === "ok") setState("success");
      else setState("invalid");
    });
  };

  if (state === "success") {
    return (
      <div className="space-y-5 text-center">
        <CheckCircle2
          className="mx-auto size-10 text-success"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Email verified
          </h1>
          <p className="text-sm text-muted-foreground">
            Your email address is confirmed. You can now sign in.
          </p>
        </div>
        <Button render={<Link href="/login" />} className="w-full">
          Continue to sign in
        </Button>
      </div>
    );
  }

  if (state === "invalid" || !token) {
    return (
      <div className="space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Link invalid or expired
          </h1>
          <p className="text-sm text-muted-foreground">
            This verification link is no longer valid. Request a new one and try
            again.
          </p>
        </div>
        <Button
          render={<Link href="/login" />}
          variant="outline"
          className="w-full"
        >
          Request a new link from sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Verify your email
        </h1>
        <p className="text-sm text-muted-foreground">
          Confirm this email address to finish securing your account.
        </p>
      </div>
      <InlineAlert variant="info" title="One more step">
        Select confirm to verify the email address on this account.
      </InlineAlert>
      <Button className="w-full" loading={pending} onClick={confirm}>
        {pending ? "Confirming…" : "Confirm my email"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Not your link?{" "}
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
