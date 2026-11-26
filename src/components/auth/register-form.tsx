"use client";

/**
 * Registration form — every alumni field, stepped like turning pages of the
 * register: one entry at a time instead of one long scroll. Required fields
 * carry the schema's NOT NULL, optional fields are marked "(optional)".
 * The submit seam is a stub until the real registration action lands.
 */
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  registerFormSchema,
  type RegisterFormDraft,
} from "@/features/register/schemas";
import type { Department } from "@/features/alumni-directory/types";

/** Spec range for the year selects (schema allows wider; UI constrains). */
const YEARS = Array.from({ length: 16 }, (_, i) => 2015 + i);

/** Form state is the schema's INPUT shape: selects carry strings, consent a
    boolean; coercion/literals only resolve on safeParse. */
type Draft = Omit<
  RegisterFormDraft,
  "sessionStartYear" | "sessionEndYear" | "passingYear" | "gender" | "consent"
> & {
  sessionStartYear: string;
  sessionEndYear: string;
  passingYear: string;
  gender: "" | "male" | "female" | "other";
  consent: boolean;
};

const EMPTY: Draft = {
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
  gender: "",
  city: "",
  district: "",
  country: "",
  employer: "",
  jobTitle: "",
  sector: "",
  bio: "",
  linkedin: "",
  mentorAvailable: false,
  directoryVisible: false,
};

const EMPTY_MESSAGES: Record<string, string> = {
  departmentId: "Choose your department.",
  sessionStartYear: "Choose the session start year.",
  sessionEndYear: "Choose the session end year.",
  passingYear: "Choose your passing year.",
};

function fieldErrors(draft: Draft): {
  ok: boolean;
  errors: Record<string, string>;
} {
  const result = registerFormSchema.safeParse(draft);
  if (result.success) return { ok: true, errors: {} };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "");
    if (!field || errors[field]) continue;
    const raw = draft[field as keyof Draft];
    errors[field] =
      typeof raw === "string" && raw === "" && EMPTY_MESSAGES[field]
        ? EMPTY_MESSAGES[field]
        : issue.message;
  }
  return { ok: false, errors };
}

/** The register's own pages — one entry per step. */
const STEPS: { title: string; fields: (keyof Draft)[] }[] = [
  { title: "About you", fields: ["fullName", "rollNumber", "gender"] },
  {
    title: "Your batch",
    fields: [
      "departmentId",
      "sessionStartYear",
      "sessionEndYear",
      "passingYear",
    ],
  },
  {
    title: "Contact",
    fields: ["email", "phone", "city", "district", "country"],
  },
  {
    title: "After college",
    fields: [
      "employer",
      "jobTitle",
      "sector",
      "bio",
      "linkedin",
      "mentorAvailable",
      "directoryVisible",
    ],
  },
  { title: "Account", fields: ["password", "confirmPassword", "consent"] },
];

/** Stand-in until the real registerAction lands (Phase 7). The final call
    will take the parsed RegisterFormDraft — the contract is already final. */
async function submitRegistration(): Promise<void> {
  // TODO(phase-7): call the real server action — existence check → create →
  // queue verification email.
  await new Promise((r) => setTimeout(r, 550));
}

export function RegisterForm({
  departments,
}: {
  departments: Pick<Department, "id" | "name">[];
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(0);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  function next() {
    const { errors } = fieldErrors(draft);
    const mine = STEPS[step]!.fields.filter((f) => errors[f]);
    if (mine.length > 0) {
      setErrors(Object.fromEntries(mine.map((f) => [f, errors[f]!])));
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
    window.scrollTo({ top: 0 });
  }

  function back() {
    setErrors({});
    setStep((s) => s - 1);
    window.scrollTo({ top: 0 });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { ok, errors } = fieldErrors(draft);
    if (!ok) {
      // Jump to the earliest page that has an error so it can be fixed there.
      const first = STEPS.findIndex((s) => s.fields.some((f) => errors[f]));
      setStep(first === -1 ? step : first);
      setErrors(errors);
      return;
    }
    setPending(true);
    await submitRegistration();
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
        <Button variant="outline" render={<Link href="/login" />}>
          Back to sign in
        </Button>
      </div>
    );
  }

  const errorList = Object.values(errors);
  const isLast = step === STEPS.length - 1;

  const yearSelect = (
    key: "sessionStartYear" | "sessionEndYear" | "passingYear",
  ) => (
    <Select value={draft[key]} onValueChange={(v) => set(key, String(v))}>
      <SelectTrigger
        className="w-full"
        aria-invalid={errors[key] ? true : undefined}
      >
        <span className="flex-1 text-left">{draft[key] || "Year…"}</span>
      </SelectTrigger>
      <SelectContent>
        {YEARS.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {/* Page rail — the register's entries, current one open. */}
      <nav aria-label="Registration steps" className="space-y-1.5">
        <ol className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-center">
              <button
                type="button"
                onClick={() => i < step && (setErrors({}), setStep(i))}
                disabled={i > step}
                aria-current={i === step ? "step" : undefined}
                aria-label={`${s.title}${i < step ? " — done" : i === step ? " — current" : ""}`}
                className={`flex size-6 items-center justify-center rounded-full border font-mono text-[11px] transition-colors ${
                  i < step
                    ? "border-success-ink/30 bg-success-tint text-success-ink"
                    : i === step
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </button>
              {i < STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className={`mx-1 h-px w-5 ${i < step ? "bg-success-ink/40" : "bg-border"}`}
                />
              ) : null}
            </li>
          ))}
        </ol>
        <p className="text-sm">
          <span className="font-heading font-semibold">
            {STEPS[step]!.title}
          </span>
          <span className="text-muted-foreground">
            {" "}
            — page {step + 1} of {STEPS.length}
          </span>
        </p>
      </nav>

      {errorList.length > 0 ? (
        <InlineAlert variant="destructive" title="Check the highlighted fields">
          <ul className="list-disc space-y-0.5 pl-4">
            {errorList.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </InlineAlert>
      ) : null}

      {step === 0 ? (
        <div className="space-y-4">
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
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Roll number"
              required
              error={errors.rollNumber}
              hint="As in the college register."
            >
              {(id, describedBy) => (
                <Input
                  id={id}
                  name="rollNumber"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  value={draft.rollNumber}
                  onChange={(e) => set("rollNumber", e.target.value)}
                  placeholder="BS-CS-2019-042…"
                  className="font-mono"
                  aria-describedby={describedBy}
                  aria-invalid={errors.rollNumber ? true : undefined}
                />
              )}
            </FormField>
            <FormField label="Gender (optional)" error={errors.gender}>
              {(id, describedBy) => (
                <Select
                  value={draft.gender}
                  onValueChange={(v) => set("gender", v as Draft["gender"])}
                >
                  <SelectTrigger
                    id={id}
                    className="w-full"
                    aria-describedby={describedBy}
                  >
                    <span className="flex-1 text-left">
                      {draft.gender
                        ? draft.gender[0]!.toUpperCase() + draft.gender.slice(1)
                        : "Select…"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormField>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
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
                    {departments.find((d) => d.id === draft.departmentId)
                      ?.name ?? "Select your department…"}
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
          <FormField label="Degree" hint="GGCB registers BS graduates for now.">
            {(id) => <Input id={id} value="BS" disabled readOnly />}
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField
              label="Session start"
              required
              error={errors.sessionStartYear}
            >
              {(id, describedBy) => (
                <div id={id} aria-describedby={describedBy}>
                  {yearSelect("sessionStartYear")}
                </div>
              )}
            </FormField>
            <FormField
              label="Session end"
              required
              error={errors.sessionEndYear}
            >
              {(id, describedBy) => (
                <div id={id} aria-describedby={describedBy}>
                  {yearSelect("sessionEndYear")}
                </div>
              )}
            </FormField>
            <FormField label="Passed" required error={errors.passingYear}>
              {(id, describedBy) => (
                <div id={id} aria-describedby={describedBy}>
                  {yearSelect("passingYear")}
                </div>
              )}
            </FormField>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(["city", "district", "country"] as const).map((k) => (
              <FormField
                key={k}
                label={`${k[0]!.toUpperCase()}${k.slice(1)} (optional)`}
                error={errors[k]}
              >
                {(id, describedBy) => (
                  <Input
                    id={id}
                    name={k}
                    autoComplete={
                      k === "country"
                        ? "country-name"
                        : k === "city"
                          ? "address-level2"
                          : "address-level1"
                    }
                    value={draft[k]}
                    onChange={(e) => set(k, e.target.value)}
                    placeholder="…"
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
            ))}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Everything on this page is optional — it fills out your directory
            entry.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Employer" error={errors.employer}>
              {(id, describedBy) => (
                <Input
                  id={id}
                  name="organization"
                  autoComplete="organization"
                  value={draft.employer}
                  onChange={(e) => set("employer", e.target.value)}
                  placeholder="Where you work…"
                  aria-describedby={describedBy}
                />
              )}
            </FormField>
            <FormField label="Job title" error={errors.jobTitle}>
              {(id, describedBy) => (
                <Input
                  id={id}
                  name="organization-title"
                  autoComplete="organization-title"
                  value={draft.jobTitle}
                  onChange={(e) => set("jobTitle", e.target.value)}
                  placeholder="Your role…"
                  aria-describedby={describedBy}
                />
              )}
            </FormField>
          </div>
          <FormField label="Sector" error={errors.sector}>
            {(id, describedBy) => (
              <Input
                id={id}
                value={draft.sector}
                onChange={(e) => set("sector", e.target.value)}
                placeholder="Education, health, IT…"
                aria-describedby={describedBy}
              />
            )}
          </FormField>
          <FormField
            label="Bio"
            hint={`${draft.bio.length}/1000 — a line or two for the directory.`}
            error={errors.bio}
          >
            {(id, describedBy) => (
              <Textarea
                id={id}
                value={draft.bio}
                onChange={(e) => set("bio", e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="What you've been up to since college…"
                aria-describedby={describedBy}
              />
            )}
          </FormField>
          <FormField label="LinkedIn or portfolio" error={errors.linkedin}>
            {(id, describedBy) => (
              <Input
                id={id}
                type="url"
                name="url"
                autoComplete="url"
                spellCheck={false}
                value={draft.linkedin}
                onChange={(e) => set("linkedin", e.target.value)}
                placeholder="https://…"
                aria-describedby={describedBy}
              />
            )}
          </FormField>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={draft.mentorAvailable}
                onCheckedChange={(v) => set("mentorAvailable", v === true)}
                aria-labelledby="mentor-label"
                className="mt-0.5"
              />
              <p id="mentor-label" className="text-sm leading-snug">
                Available to mentor current students
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                checked={draft.directoryVisible}
                onCheckedChange={(v) => set("directoryVisible", v === true)}
                aria-labelledby="dir-label"
                className="mt-0.5"
              />
              <p id="dir-label" className="text-sm leading-snug">
                Show me in the alumni directory once verified
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          <div className="space-y-1.5 rounded-md border border-dashed p-3">
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
                These details are mine and the college may verify them against
                the register before approving my account.
              </p>
            </div>
            {errors.consent ? (
              <FieldError id="consent-error" role="alert">
                {errors.consent}
              </FieldError>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2 border-t pt-4">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={back}>
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Button>
        ) : null}
        {isLast ? (
          <Button type="submit" className="flex-1" loading={pending}>
            Create account
          </Button>
        ) : (
          <Button type="button" className="flex-1" onClick={next}>
            Continue
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link
          href="/login"
          className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
