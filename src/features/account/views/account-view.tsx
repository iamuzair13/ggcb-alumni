"use client";

/**
 * Account settings — reachable for every alumni persona (verified or not).
 * Read-only email, change-password form, and "sign out everywhere". All
 * demo-only: submissions simulate a round-trip and toast.
 */
import { useState } from "react";
import { toast } from "sonner";
import { LogOut, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PasswordField } from "@/components/shared/password-field";
import { useDemo } from "@/components/demo/demo-provider";
import { changePasswordSchema } from "../schemas";

export function AccountView({ email }: { email: string }) {
  const { simulate } = useDemo();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const result = changePasswordSchema.safeParse({
      currentPassword: current,
      newPassword: next,
      confirmPassword: confirm,
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const f = String(issue.path[0] ?? "");
        if (f && !errs[f]) errs[f] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    setPending(true);
    await simulate(null, 550);
    setPending(false);
    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success("Password changed.");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign-in details for your alumni account.
        </p>
      </div>

      <Card className="p-5">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
          Email
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {email} — this is your sign-in address. To change it, contact the
          college alumni office.{" "}
          <span className="text-foreground/70">
            [Placeholder: alumni office contact]
          </span>
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="font-heading text-base font-semibold">
          Change password
        </h2>
        <form onSubmit={changePassword} className="mt-4 space-y-4" noValidate>
          <PasswordField
            label="Current password"
            name="currentPassword"
            autoComplete="current-password"
            value={current}
            onValueChange={setCurrent}
            error={errors.currentPassword}
          />
          <PasswordField
            label="New password"
            name="newPassword"
            autoComplete="new-password"
            value={next}
            onValueChange={setNext}
            error={errors.newPassword}
            showPolicyHint
          />
          <PasswordField
            label="Confirm new password"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirm}
            onValueChange={setConfirm}
            confirmValue={next}
            error={errors.confirmPassword}
            showPolicyHint
          />
          <Button type="submit" loading={pending}>
            Update password
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="font-heading text-base font-semibold">Sessions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Signs you out on every device, including this one.
        </p>
        <Button
          variant="destructive"
          className="mt-3"
          onClick={() => setSignOutOpen(true)}
        >
          <LogOut data-icon="inline-start" aria-hidden="true" />
          Sign out everywhere
        </Button>
      </Card>

      <ConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        title="Sign out everywhere?"
        description="You will need your email and password to sign back in. Every active session on other devices ends too."
        confirmLabel="Sign out everywhere"
        destructive
        pending={signingOut}
        onConfirm={async () => {
          setSigningOut(true);
          await simulate(null, 500);
          setSigningOut(false);
          setSignOutOpen(false);
          toast.success("Signed out of all sessions.");
        }}
      />
    </div>
  );
}
