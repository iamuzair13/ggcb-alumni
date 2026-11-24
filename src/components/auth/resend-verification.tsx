"use client";

/**
 * Resend verification — used from the login unverified notice. Always a
 * neutral "if it exists, it was sent" response (spec §4.2).
 */
import { useState, useTransition } from "react";
import { MailPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { resendVerificationAction } from "@/lib/actions/account";

export function ResendVerification({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  if (!email) return null;

  if (sent) {
    return (
      <p
        className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"
        role="status"
      >
        <MailPlus className="size-4" aria-hidden="true" />
        If that account exists and is unverified, a new link is on its way.
      </p>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-2"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          await resendVerificationAction({ email });
          setSent(true);
        })
      }
    >
      <MailPlus data-icon="inline-start" aria-hidden="true" />
      Resend verification email
    </Button>
  );
}
