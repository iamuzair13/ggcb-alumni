"use client";

/**
 * Registration form — rebuilt on the 21st.dev RegistrationStepper: a
 * vertical accordion rail inside .reg-scope, an identity independent of the
 * evergreen ledger theme. Same draft/validation/submit seam as before.
 */
import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight } from "lucide-react";

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
import { RegistrationStepper } from "@/components/ui/registration-stepper";
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
const STEPS: {
  title: string;
  description: string;
  fields: (keyof Draft)[];
}[] = [
  {
    title: "About you",
    description: "Your name and roll number",
    fields: ["fullName", "rollNumber", "gender"],
  },
  {
    title: "Your batch",
    description: "Department and years",
    fields: [
      "departmentId",
      "sessionStartYear",
      "sessionEndYear",
      "passingYear",
    ],
  },
  {
    title: "Contact",
    description: "How the college can reach you",
    fields: ["email", "phone", "city", "district", "country"],
  },
  {
    title: "After college",
    description: "Optional directory details",
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
  {
    title: "Account",
    description: "Password and consent",
    fields: ["password", "confirmPassword", "consent"],
  },
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
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  /** Move focus to the newly active step header — keyboard and SR users
      land on the open page, not lost inside collapsed content. */
  function focusHeading() {
    requestAnimationFrame(() => {
      formRef.current
        ?.querySelector<HTMLElement>('[aria-current="step"]')
        ?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    });
  }

  function next() {
    const { errors } = fieldErrors(draft);
    const mine = STEPS[step]!.fields.filter((f) => errors[f]);
    if (mine.length > 0) {
      setErrors(Object.fromEntries(mine.map((f) => [f, errors[f]!])));
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
    focusHeading();
  }

  function back() {
    setErrors({});
    setStep((s) => s - 1);
    focusHeading();
  }

  /** Validate a single field on blur — only reports this field, and only
      when it actually has an error (no clearing noise). */
  function blurValidate(key: keyof Draft) {
    const { errors } = fieldErrors(draft);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: errors[key]! }));
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
      <div className="reg-scope space-y-5">
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
    id: string,
    describedBy: string | undefined,
  ) => (
    <Select value={draft[key]} onValueChange={(v) => set(key, String(v))}>
      <SelectTrigger
        id={id}
        className="w-full"
        aria-describedby={describedBy}
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

  /** Nav row inside each step's expanded content. */
  const nav = (
    <div className="flex items-center gap-2 pt-1">
      {step > 0 ? (
        <Button type="button" variant="outline" size="sm" onClick={back}>
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
  );

  const errorBanner = errorList.length > 0 && (
    <InlineAlert variant="destructive" title="Check the highlighted fields">
      <ul className="list-disc space-y-0.5 pl-4">
        {errorList.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </InlineAlert>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="reg-scope" ref={formRef}>
      <RegistrationStepper
        className="max-w-none"
        steps={[
          {
            step: 1,
            title: STEPS[0]!.title,
            description: STEPS[0]!.description,
            content: (
              <div className="space-y-4">
                {errorBanner}
                <FormField label="Full name" required error={errors.fullName}>
                  {(id, describedBy) => (
                    <Input
                      id={id}
                      name="fullName"
                      autoComplete="name"
                      required
                      value={draft.fullName}
                      onChange={(e) => set("fullName", e.target.value)}
                      onBlur={() => blurValidate("fullName")}
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
                        onBlur={() => blurValidate("rollNumber")}
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
                        onValueChange={(v) =>
                          set("gender", v as Draft["gender"])
                        }
                      >
                        <SelectTrigger
                          id={id}
                          className="w-full"
                          aria-describedby={describedBy}
                        >
                          <span className="flex-1 text-left">
                            {draft.gender
                              ? draft.gender[0]!.toUpperCase() +
                                draft.gender.slice(1)
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
                {nav}
              </div>
            ),
          },
          {
            step: 2,
            title: STEPS[1]!.title,
            description: STEPS[1]!.description,
            content: (
              <div className="space-y-4">
                {errorBanner}
                <FormField
                  label="Department"
                  required
                  error={errors.departmentId}
                >
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
                <FormField
                  label="Degree"
                  hint="GGCB registers BS graduates for now."
                >
                  {(id) => <Input id={id} value="BS" disabled readOnly />}
                </FormField>
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    label="Session start"
                    required
                    error={errors.sessionStartYear}
                  >
                    {(id, describedBy) =>
                      yearSelect("sessionStartYear", id, describedBy)
                    }
                  </FormField>
                  <FormField
                    label="Session end"
                    required
                    error={errors.sessionEndYear}
                  >
                    {(id, describedBy) =>
                      yearSelect("sessionEndYear", id, describedBy)
                    }
                  </FormField>
                  <FormField label="Passed" required error={errors.passingYear}>
                    {(id, describedBy) =>
                      yearSelect("passingYear", id, describedBy)
                    }
                  </FormField>
                </div>
                {nav}
              </div>
            ),
          },
          {
            step: 3,
            title: STEPS[2]!.title,
            description: STEPS[2]!.description,
            content: (
              <div className="space-y-4">
                {errorBanner}
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
                        onBlur={() => blurValidate("email")}
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
                        onBlur={() => blurValidate("phone")}
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
                          onBlur={() => blurValidate(k)}
                          placeholder="…"
                          aria-describedby={describedBy}
                        />
                      )}
                    </FormField>
                  ))}
                </div>
                {nav}
              </div>
            ),
          },
          {
            step: 4,
            title: STEPS[3]!.title,
            description: STEPS[3]!.description,
            content: (
              <div className="space-y-4">
                {errorBanner}
                <p className="text-sm text-muted-foreground">
                  Everything on this page is optional — it fills out your
                  directory entry.
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
                        onBlur={() => blurValidate("employer")}
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
                        onBlur={() => blurValidate("jobTitle")}
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
                      onBlur={() => blurValidate("sector")}
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
                      onBlur={() => blurValidate("bio")}
                      maxLength={1000}
                      rows={3}
                      placeholder="What you've been up to since college…"
                      aria-describedby={describedBy}
                    />
                  )}
                </FormField>
                <FormField
                  label="LinkedIn or portfolio"
                  error={errors.linkedin}
                >
                  {(id, describedBy) => (
                    <Input
                      id={id}
                      type="url"
                      name="url"
                      autoComplete="url"
                      spellCheck={false}
                      value={draft.linkedin}
                      onChange={(e) => set("linkedin", e.target.value)}
                      onBlur={() => blurValidate("linkedin")}
                      placeholder="https://…"
                      aria-describedby={describedBy}
                    />
                  )}
                </FormField>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={draft.mentorAvailable}
                      onCheckedChange={(v) =>
                        set("mentorAvailable", v === true)
                      }
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
                      onCheckedChange={(v) =>
                        set("directoryVisible", v === true)
                      }
                      aria-labelledby="dir-label"
                      className="mt-0.5"
                    />
                    <p id="dir-label" className="text-sm leading-snug">
                      Show me in the alumni directory once verified
                    </p>
                  </div>
                </div>
                {nav}
              </div>
            ),
          },
          {
            step: 5,
            title: STEPS[4]!.title,
            description: STEPS[4]!.description,
            content: (
              <div className="space-y-4">
                {errorBanner}
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Your entry in the register
                  </p>
                  <dl className="divide-y divide-border rounded-md border text-sm">
                    {(
                      [
                        ["Name", draft.fullName, 0],
                        ["Roll number", draft.rollNumber, 0, "mono"],
                        [
                          "Department",
                          departments.find((d) => d.id === draft.departmentId)
                            ?.name,
                          1,
                        ],
                        [
                          "Session",
                          `${draft.sessionStartYear}–${draft.sessionEndYear} · passed ${draft.passingYear}`,
                          1,
                        ],
                        ["Email", draft.email, 2],
                        ["Phone", draft.phone, 2],
                        [
                          "Place",
                          [draft.city, draft.district, draft.country]
                            .filter(Boolean)
                            .join(", "),
                          2,
                        ],
                        [
                          "Work",
                          [draft.jobTitle, draft.employer]
                            .filter(Boolean)
                            .join(" · "),
                          3,
                        ],
                      ] as [string, string | undefined, number, string?][]
                    )
                      .filter(([, v]) => v)
                      .map(([label, value, page, mono]) => (
                        <div
                          key={label}
                          className="flex items-baseline justify-between gap-3 px-3 py-2"
                        >
                          <dt className="shrink-0 text-muted-foreground">
                            {label}
                          </dt>
                          <dd
                            className={`min-w-0 truncate text-right ${mono ? "font-mono text-[13px]" : ""}`}
                          >
                            {value}
                          </dd>
                          <button
                            type="button"
                            onClick={() => {
                              setErrors({});
                              setStep(page);
                            }}
                            className="shrink-0 text-xs text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
                          >
                            Edit
                          </button>
                        </div>
                      ))}
                  </dl>
                </div>
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
                      aria-describedby={
                        errors.consent ? "consent-error" : undefined
                      }
                      aria-invalid={errors.consent ? true : undefined}
                      className="mt-0.5"
                    />
                    <p id="consent-label" className="text-sm leading-snug">
                      These details are mine and the college may verify them
                      against the register before approving my account.
                    </p>
                  </div>
                  {errors.consent ? (
                    <FieldError id="consent-error" role="alert">
                      {errors.consent}
                    </FieldError>
                  ) : null}
                </div>
                {nav}
              </div>
            ),
          },
        ]}
        currentStep={step}
        headerTitle="Register as alumni"
        headerStatus={`Page ${step + 1} of ${STEPS.length}`}
        onStepClick={(i) => {
          setErrors({});
          setStep(i);
          focusHeading();
        }}
      />

      <p className="mt-4 text-center text-sm text-muted-foreground">
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
