"use client";

/**
 * FormDialog — quick create/edit dialogs (≤ 6 fields, blueprint §2).
 * Handles the pending state, closes on success, surfaces a generic error,
 * and hands server fieldErrors back to the form via a callback.
 */
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import type { ActionResult } from "@/lib/result";
import type { ServiceResult } from "@/lib/result";

export type FormDialogAction = (
  input: unknown,
) => Promise<ActionResult<ServiceResult>>;

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  pendingLabel,
  action,
  buildInput,
  onSuccess,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel: string;
  pendingLabel?: string;
  action: FormDialogAction;
  /** Map the form's controlled state → the action input. */
  buildInput: () => unknown;
  onSuccess?: () => void;
  children: (
    errors: Record<string, string>,
    clearError: (field: string) => void,
  ) => React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const clearError = (field: string) =>
    setErrors((e) =>
      Object.fromEntries(Object.entries(e).filter(([k]) => k !== field)),
    );

  const submit = () => {
    startTransition(async () => {
      setFormError(null);
      const result = await action(buildInput());
      if (result.ok && result.data.status === "ok") {
        toast.success("Saved");
        setErrors({});
        onOpenChange(false);
        onSuccess?.();
        return;
      }
      if (result.ok && result.data.status === "error") {
        const d = result.data;
        if (d.fieldErrors) setErrors(d.fieldErrors);
        setFormError(d.message);
        return;
      }
      setFormError(result.ok ? "Something went wrong" : result.message);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          {formError ? (
            <InlineAlert variant="destructive">{formError}</InlineAlert>
          ) : null}
          {children(errors, clearError)}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {pending ? (pendingLabel ?? "Saving…") : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
