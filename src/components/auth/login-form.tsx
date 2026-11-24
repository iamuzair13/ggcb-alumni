"use client";

/**
 * Credentials sign-in form — design-system only (FormField, Input, Button).
 * Accessible: labelled inputs, aria-describedby errors, show/hide toggle
 * with accessible name, password-manager-friendly autocomplete, loading
 * state that keeps the label in the a11y tree (opacity, not visibility).
 */
import { useActionState, useState } from "react";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { loginAction, type LoginFormState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const initial: LoginFormState = {};

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {state.error ? (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
            state.code === "rate_limited"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
              : "border-destructive/40 bg-destructive/10 text-destructive",
          )}
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{state.error}</p>
        </div>
      ) : null}

      <FormField label="Email" required>
        {(id, describedBy) => (
          <Input
            id={id}
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            spellCheck={false}
            required
            placeholder="you@example.com…"
            aria-describedby={describedBy}
          />
        )}
      </FormField>

      <FormField label="Password" required>
        {(id, describedBy) => (
          <div className="relative">
            <Input
              id={id}
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              placeholder="Your password…"
              aria-describedby={describedBy}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        )}
      </FormField>

      <Button className="w-full" type="submit" loading={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
