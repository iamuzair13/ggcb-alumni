"use client";

/**
 * Shared "choose a password" view for /reset-password and /set-password
 * (invitations). Policy hint mirrors the server; consumption is POST-only;
 * success shows a Sign-in action — never auto-login (spec §4.2/§5.1).
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { PasswordField } from "@/components/shared/password-field";
import type { ActionResult } from "@/lib/result";
import type { ConsumeResult } from "@/lib/result";

export type PasswordTokenAction = (input: {
  token: string;
  password: string;
  confirm: string;
}) => Promise<ActionResult<ConsumeResult>>;

export function ChoosePasswordView({
  token,
  action,
  variant,
  initialState,
}: {
  token: string | null;
  action: PasswordTokenAction;
  variant: "reset" | "invite";
  /** Previews only — seeds a terminal state. */
  initialState?: "idle" | "success" | "invalid";
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "success" | "invalid">(
    initialState ?? (token ? "idle" : "invalid"),
  );
  const [pending, startTransition] = useTransition();

  const copy =
    variant === "reset"
      ? {
          title: "Choose a new password",
          hint: "Use this link once to set a new password for your account.",
          requestPath: "/forgot-password",
          requestLabel: "Request a new reset link",
        }
      : {
          title: "Set your password",
          hint: "Welcome to the alumni staff team. Set a password to activate your account.",
          requestPath: "/login",
          requestLabel: "Ask your admin for a new invitation",
        };

  const submit = () => {
    if (!token) return;
    setError(null);
    startTransition(async () => {
      const r = await action({ token, password, confirm });
      if (r.ok && r.data.status === "ok") {
        setState("success");
      } else if (r.ok && r.data.status === "policy") {
        setError(r.data.reason);
      } else {
        setState("invalid");
      }
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
            Password set
          </h1>
          <p className="text-sm text-muted-foreground">
            Your password has been updated. Sign in with it to continue.
          </p>
        </div>
        <Button
          render={<Link href="/login?notice=password-changed" />}
          className="w-full"
        >
          Sign in
        </Button>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Link invalid or expired
          </h1>
          <p className="text-sm text-muted-foreground">
            This password link is no longer valid. Request a new one and try
            again.
          </p>
        </div>
        <Button
          render={<Link href={copy.requestPath} />}
          variant="outline"
          className="w-full"
        >
          {copy.requestLabel}
        </Button>
      </div>
    );
  }

  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          {copy.title}
        </h1>
        <p className="text-sm text-muted-foreground">{copy.hint}</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (mismatch) {
            setError("Passwords do not match");
            return;
          }
          submit();
        }}
        className="space-y-4"
        noValidate
      >
        {error ? (
          <InlineAlert variant="destructive">{error}</InlineAlert>
        ) : null}
        <PasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          value={password}
          onValueChange={setPassword}
          showPolicyHint
        />
        <PasswordField
          label="Confirm password"
          name="confirm"
          autoComplete="new-password"
          value={confirm}
          onValueChange={setConfirm}
          confirmValue={password}
          showPolicyHint
          error={mismatch ? "Passwords do not match" : undefined}
          placeholder="Repeat the password…"
        />
        <Button type="submit" className="w-full" loading={pending}>
          {pending ? "Saving…" : "Save password"}
        </Button>
      </form>
    </div>
  );
}
