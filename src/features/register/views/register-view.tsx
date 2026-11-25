"use client";

/**
 * Registration form — demo of the real /register flow (blueprint §3.1).
 * Client-side zod mirrors the server schema; every submission ends at the
 * same neutral confirmation so the prototype never leaks whether a record
 * existed.
 */
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { InlineAlert } from "@/components/shared/inline-alert";
import { PasswordField } from "@/components/shared/password-field";
import { useDemo } from "@/components/demo/demo-provider";
import { registrationSchema } from "../schemas";
import type { Department } from "@/features/alumni-directory/types";

/** Spec range for the year selects (schema allows wider; UI constrains). */
const YEARS = Array.from({ length: 16 }, (_, i) => 2015 + i);

interface RegisterDraft {
  fullName: string;
  rollNumber: string;
  departmentId: string;
  sessionStartYear: string;
  sessionEndYear: string;
  passingYear: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  consent: boolean;
}

const EMPTY: RegisterDraft = {
  fullName: "",
  rollNumber: "",
  departmentId: "",
  sessionStartYear: "",
  sessionEndYear: "",
  passingYear: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  consent: false,
};

/** Friendly required messages when a coerced/select field is left empty. */
const EMPTY_MESSAGES: Record<string, string> = {
  departmentId: "Choose your department.",
  sessionStartYear: "Choose the session start year.",
  sessionEndYear: "Choose the session end year.",
  passingYear: "Choose your passing year.",
};

function fieldErrors(draft: RegisterDraft): {
  ok: boolean;
  errors: Record<string, string>;
} {
  const result = registrationSchema.safeParse(draft);
  if (result.success) return { ok: true, errors: {} };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "");
    if (!field || errors[field]) continue; // first issue per field
    const raw = draft[field as keyof RegisterDraft];
    errors[field] =
      typeof raw === "string" && raw === "" && EMPTY_MESSAGES[field]
        ? EMPTY_MESSAGES[field]
        : issue.message;
  }
  return { ok: false, errors };
}

export function RegisterView({
  departments,
}: {
  departments: Pick<Department, "id" | "name">[];
}) {
  const { simulate } = useDemo();
  const [draft, setDraft] = useState<RegisterDraft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [throttled, setThrottled] = useState(false);

  const set = <K extends keyof RegisterDraft>(
    key: K,
    value: RegisterDraft[K],
  ) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { ok, errors } = fieldErrors(draft);
    if (!ok) {
      setErrors(errors);
      return;
    }
    setPending(true);
    await simulate(null, 550);
    setPending(false);
    setSubmitted(true);
    toast.success("Registration received.");
  }

  if (submitted) {
    return (
      <div className="space-y-5">
        <InlineAlert variant="success" title="Registration received">
          If this record can be registered, you will receive an email with next
          steps.
        </InlineAlert>
        <p className="text-sm text-muted-foreground">
          The message is the same whether the record is new, a duplicate, or
          needs a manual check — that is intentional.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            render={<Link href="/design/demo/public/check-email" />}
          >
            Next screen: check your email
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSubmitted(false);
              setDraft(EMPTY);
              setErrors({});
            }}
          >
            Fill the form again
          </Button>
        </div>
      </div>
    );
  }

  const errorList = Object.values(errors);

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {throttled ? (
        <InlineAlert variant="destructive" title="Too many attempts">
          Too many attempts — wait a few minutes.
        </InlineAlert>
      ) : null}
      {errorList.length > 0 ? (
        <InlineAlert variant="destructive" title="Check the highlighted fields">
          <ul className="list-disc space-y-0.5 pl-4">
            {errorList.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </InlineAlert>
      ) : null}

      <FormField label="Full name" required error={errors.fullName}>
        {(id, describedBy) => (
          <Input
            id={id}
            name="fullName"
            autoComplete="name"
            required
            value={draft.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="Your full name…"
            aria-describedby={describedBy}
            aria-invalid={errors.fullName ? true : undefined}
          />
        )}
      </FormField>

      <FormField label="Roll number" required error={errors.rollNumber}>
        {(id, describedBy) => (
          <Input
            id={id}
            name="rollNumber"
            autoComplete="off"
            spellCheck={false}
            required
            value={draft.rollNumber}
            onChange={(e) => set("rollNumber", e.target.value)}
            placeholder="Enter your roll number…"
            aria-describedby={describedBy}
            aria-invalid={errors.rollNumber ? true : undefined}
          />
        )}
      </FormField>

      <FormField label="Department" required error={errors.departmentId}>
        {(id, describedBy) => (
          <Select
            value={draft.departmentId}
            onValueChange={(v) => set("departmentId", String(v))}
          >
            <SelectTrigger
              id={id}
              className="w-full"
              aria-describedby={describedBy}
              aria-invalid={errors.departmentId ? true : undefined}
            >
              <span className="flex-1 text-left">
                {departments.find((d) => d.id === draft.departmentId)?.name ??
                  "Select your department…"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Session start year"
          required
          error={errors.sessionStartYear}
        >
          {(id, describedBy) => (
            <Select
              value={draft.sessionStartYear}
              onValueChange={(v) => set("sessionStartYear", String(v))}
            >
              <SelectTrigger
                id={id}
                className="w-full"
                aria-describedby={describedBy}
                aria-invalid={errors.sessionStartYear ? true : undefined}
              >
                <span className="flex-1 text-left">
                  {draft.sessionStartYear || "Year…"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField
          label="Session end year"
          required
          error={errors.sessionEndYear}
        >
          {(id, describedBy) => (
            <Select
              value={draft.sessionEndYear}
              onValueChange={(v) => set("sessionEndYear", String(v))}
            >
              <SelectTrigger
                id={id}
                className="w-full"
                aria-describedby={describedBy}
                aria-invalid={errors.sessionEndYear ? true : undefined}
              >
                <span className="flex-1 text-left">
                  {draft.sessionEndYear || "Year…"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      </div>

      <FormField label="Passing year" required error={errors.passingYear}>
        {(id, describedBy) => (
          <Select
            value={draft.passingYear}
            onValueChange={(v) => set("passingYear", String(v))}
          >
            <SelectTrigger
              id={id}
              className="w-full"
              aria-describedby={describedBy}
              aria-invalid={errors.passingYear ? true : undefined}
            >
              <span className="flex-1 text-left">
                {draft.passingYear || "Year…"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <FormField label="Email" required error={errors.email}>
        {(id, describedBy) => (
          <Input
            id={id}
            type="email"
            name="email"
            autoComplete="email"
            spellCheck={false}
            required
            value={draft.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com…"
            aria-describedby={describedBy}
            aria-invalid={errors.email ? true : undefined}
          />
        )}
      </FormField>

      <FormField label="Phone" required error={errors.phone}>
        {(id, describedBy) => (
          <Input
            id={id}
            type="tel"
            name="phone"
            autoComplete="tel"
            required
            value={draft.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+92 300 0000000…"
            aria-describedby={describedBy}
            aria-invalid={errors.phone ? true : undefined}
          />
        )}
      </FormField>

      <PasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
        value={draft.password}
        onValueChange={(v) => set("password", v)}
        error={errors.password}
        showPolicyHint
      />
      <PasswordField
        label="Confirm password"
        name="confirmPassword"
        autoComplete="new-password"
        value={draft.confirmPassword}
        onValueChange={(v) => set("confirmPassword", v)}
        confirmValue={draft.password}
        error={errors.confirmPassword}
        showPolicyHint
      />

      <div className="space-y-1.5">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={draft.consent}
            onCheckedChange={(v) => set("consent", v === true)}
            aria-labelledby="consent-label"
            aria-describedby={errors.consent ? "consent-error" : undefined}
            aria-invalid={errors.consent ? true : undefined}
            className="mt-0.5"
          />
          <p id="consent-label" className="text-sm leading-snug">
            [Placeholder: consent wording supplied by the college — D11]
          </p>
        </div>
        {errors.consent ? (
          <FieldError id="consent-error" role="alert">
            {errors.consent}
          </FieldError>
        ) : null}
      </div>

      <Button
        type="submit"
        className="w-full"
        loading={pending}
        disabled={throttled}
      >
        Create account
      </Button>

      {/* Demo-only control: lets reviewers see the throttled state. */}
      <div className="border-t border-dashed pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setThrottled((t) => !t)}
        >
          {throttled ? "Show normal state" : "Show throttled state"}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link
          href="/design/demo/public/check-email"
          className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          Check your email
        </Link>
      </p>
    </form>
  );
}
