"use client";

/**
 * "Check your email" — the step after registration (blueprint §3.1).
 * The resend button carries a real 60-second cooldown so reviewers can see
 * the throttled interaction; the email itself is demo-only.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDemo } from "@/components/demo/demo-provider";

const COOLDOWN_SECONDS = 60;

export function CheckEmailView({ email }: { email: string }) {
  const { simulate } = useDemo();
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  // Tick once per second while cooling down; stops itself at zero.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    setSending(true);
    await simulate(null, 500);
    setSending(false);
    setCooldown(COOLDOWN_SECONDS);
    toast.success(
      "If this address can receive another email, it is on its way.",
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <MailCheck
          className="mt-0.5 size-6 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>
            We sent a verification link to{" "}
            <span className="font-medium text-foreground">{email}</span>. Open
            it to activate your account — the link expires after a while.
          </p>
          <p>
            Nothing arrived? Check the spam folder, then resend. Requesting a
            new link too often triggers a short wait.
          </p>
        </div>
      </div>

      <Button
        className="w-full"
        variant="outline"
        loading={sending}
        disabled={cooldown > 0}
        onClick={resend}
        aria-live="polite"
      >
        {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend email"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Wrong address?{" "}
        <Link
          href="/design/demo/public/register"
          className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          Use a different email
        </Link>
      </p>
    </div>
  );
}
