"use client";

/**
 * RejectReasonDialog — the alumni rejection dialog (ui-direction §5
 * "RejectDialog"). Required reason (min 10 chars) plus templated reasons
 * as quick chips; the reason is recorded and shared with the alumnus.
 */
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { rejectReasonSchema } from "../schemas";

const TEMPLATED_REASONS = [
  "Roll number not found in college records",
  "Details do not match the register",
  "Duplicate registration",
];

export function RejectReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Reject",
  pending = false,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fresh state each time the dialog opens — "adjust state during render"
  // (no effect → no extra render pass).
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason("");
      setError(null);
    }
  }

  function submit() {
    const parsed = rejectReasonSchema.safeParse(reason);
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? "Give a reason for the rejection.",
      );
      return;
    }
    onSubmit(parsed.data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Common reasons
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATED_REASONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setReason(t);
                    setError(null);
                  }}
                  className="rounded-full border border-input px-2.5 py-1 text-xs transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <FormField
            label="Reason"
            required
            error={error ?? undefined}
            hint="Recorded with the decision and shown to the alumnus — be specific."
          >
            {(id, describedBy) => (
              <Textarea
                id={id}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError(null);
                }}
                aria-describedby={describedBy}
                aria-invalid={error ? true : undefined}
                minLength={10}
                placeholder="Why is this record being rejected?"
              />
            )}
          </FormField>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructiveSolid"
            loading={pending}
            onClick={submit}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
