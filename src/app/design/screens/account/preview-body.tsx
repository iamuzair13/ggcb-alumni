"use client";

/**
 * Account-screen fixtures — stub actions are LOCAL client functions (a
 * plain function can only be passed to a client component when it
 * originates in the client graph; server→client props must be real
 * "use server" action references).
 */
import { Card, CardContent } from "@/components/ui/card";
import { VerifyEmailView } from "@/components/auth/verify-email-view";
import { ChoosePasswordView } from "@/components/auth/choose-password-view";
import { ForgotPasswordView } from "@/components/auth/forgot-password-view";
import type { ActionResult, ConsumeResult, NeutralResult } from "@/lib/result";

const okConsume = async (): Promise<ActionResult<ConsumeResult>> => ({
  ok: true,
  data: { status: "ok" },
});
const okNeutral = async (): Promise<ActionResult<NeutralResult>> => ({
  ok: true,
  data: { status: "ok" },
});

function Frame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-mono text-xs text-muted-foreground">{label}</h2>
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">{children}</CardContent>
      </Card>
    </section>
  );
}

export function AccountPreviewBody() {
  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-2">
      <Frame label="/verify-email — ready to confirm">
        <VerifyEmailView token="fixture" action={okConsume} />
      </Frame>
      <Frame label="/verify-email — success">
        <VerifyEmailView
          token="fixture"
          action={okConsume}
          initialState="success"
        />
      </Frame>
      <Frame label="/verify-email — invalid / missing token">
        <VerifyEmailView token={null} action={okConsume} />
      </Frame>
      <Frame label="/reset-password — form">
        <ChoosePasswordView
          token="fixture"
          action={okConsume}
          variant="reset"
        />
      </Frame>
      <Frame label="/set-password — form (invite)">
        <ChoosePasswordView
          token="fixture"
          action={okConsume}
          variant="invite"
        />
      </Frame>
      <Frame label="/reset-password — success">
        <ChoosePasswordView
          token="fixture"
          action={okConsume}
          variant="reset"
          initialState="success"
        />
      </Frame>
      <Frame label="/reset-password — invalid">
        <ChoosePasswordView token={null} action={okConsume} variant="reset" />
      </Frame>
      <Frame label="/forgot-password — idle">
        <ForgotPasswordView action={okNeutral} />
      </Frame>
      <Frame label="/forgot-password — neutral confirmation">
        <ForgotPasswordView action={okNeutral} initialState="sent" />
      </Frame>
    </main>
  );
}
