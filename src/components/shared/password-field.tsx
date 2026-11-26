"use client";

/**
 * Password field — design-system pattern (blueprint §2):
 * show/hide toggle, autocomplete attributes, paste allowed, live policy
 * hint, value is NOT cleared on error. The hint is a convenience mirror of
 * the server policy (server remains authoritative).
 */
import { useState } from "react";
import { Check, Eye, EyeOff, Minus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

export const PASSWORD_HINT_MIN = 10;

export function PasswordField({
  label,
  name,
  autoComplete,
  error,
  required = true,
  value,
  onValueChange,
  showPolicyHint = false,
  confirmValue,
  placeholder,
}: {
  label: string;
  name: string;
  autoComplete: "new-password" | "current-password";
  error?: string;
  required?: boolean;
  value: string;
  onValueChange: (v: string) => void;
  /** Show the live policy checklist (length + confirm match). */
  showPolicyHint?: boolean;
  /** When set (confirm field), shows match state. */
  confirmValue?: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const lengthOk = [...value].length >= PASSWORD_HINT_MIN;
  const matchOk =
    confirmValue === undefined
      ? null
      : value === confirmValue && value.length > 0;

  return (
    <FormField label={label} required={required} error={error}>
      {(id, describedBy) => (
        <>
          <div className="relative">
            <Input
              id={id}
              type={show ? "text" : "password"}
              name={name}
              autoComplete={autoComplete}
              required={required}
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={
                placeholder ??
                (autoComplete === "new-password"
                  ? "At least 10 characters…"
                  : "Your password…")
              }
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              aria-pressed={show}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {show ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {showPolicyHint ? (
            <ul className="mt-2 space-y-1 text-xs">
              <HintLine ok={lengthOk} label="At least 10 characters" />
              {matchOk !== null ? (
                <HintLine ok={matchOk} label="Passwords match" />
              ) : null}
              <li className="text-muted-foreground">
                Avoid common passwords and personal details.
              </li>
            </ul>
          ) : null}
        </>
      )}
    </FormField>
  );
}

function HintLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-1.5",
        ok ? "text-success" : "text-muted-foreground",
      )}
    >
      {ok ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <Minus className="size-3.5" aria-hidden="true" />
      )}
      {label}
    </li>
  );
}
