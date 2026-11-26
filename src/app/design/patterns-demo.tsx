"use client";

/**
 * Interactive demos for the composite patterns (client-only pieces):
 * PasswordField, RowActions, ConfirmDialog — /design page.
 */
import { useState } from "react";

import { PasswordField } from "@/components/shared/password-field";
import { RowActions } from "@/components/shared/row-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "sonner";

export function PasswordFieldDemo() {
  const [value, setValue] = useState("");
  return (
    <div className="max-w-md">
      <PasswordField
        label="New password"
        name="demo-password"
        autoComplete="new-password"
        value={value}
        onValueChange={setValue}
        showPolicyHint
      />
    </div>
  );
}

export function RowActionsDemo() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <RowActions
        label="Actions for Sample Staff A"
        items={[
          { key: "edit", label: "Edit…", onSelect: () => toast.info("Edit") },
          {
            key: "deactivate",
            label: "Deactivate…",
            destructive: true,
            onSelect: () => setConfirmOpen(true),
          },
          {
            key: "resend",
            label: "Resend invitation",
            disabled: true,
            disabledReason: "Has a password",
            onSelect: () => {},
          },
        ]}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Deactivate Sample Staff A?"
        description="They will be signed out everywhere and cannot sign in until reactivated."
        confirmLabel="Deactivate Sample Staff A"
        destructive
        onConfirm={() => {
          toast.success("Deactivated (demo)");
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
