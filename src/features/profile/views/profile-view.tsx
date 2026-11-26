"use client";

/**
 * My profile — the long-form editor (blueprint §3.2). Editable fields save
 * locally (demo); restricted academic fields are read-only and request a
 * change through a dialog that mirrors the real review flow. Includes the
 * photo-uploader UI (validation only — upload is a later slice), a dirty
 * guard, and a sticky action bar on mobile.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Camera,
  Clock,
  ImageIcon,
  Lock,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useDemo } from "@/components/demo/demo-provider";
import { changeRequestSchema, profileEditSchema } from "../schemas";
import type { EditableProfile } from "../types";
import type { Alumnus, Department } from "@/features/alumni-directory/types";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png"];

type RestrictedField =
  | "fullName"
  | "rollNumber"
  | "departmentId"
  | "session"
  | "passingYear"
  | "gender";

function toDraft(me: Alumnus): EditableProfile {
  return {
    phone: me.phone ?? "",
    city: me.city ?? "",
    district: me.district ?? "",
    country: me.country ?? "",
    employer: me.employer ?? "",
    jobTitle: me.jobTitle ?? "",
    sector: me.sector ?? "",
    bio: me.bio ?? "",
    linkedin: me.socialLinks.linkedin ?? "",
    mentorAvailable: me.mentorAvailable,
    directoryVisible: me.directoryVisible,
    showEmail: me.showEmail,
    showPhone: me.showPhone,
  };
}

function errorsFrom(
  issues: { path: readonly PropertyKey[]; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const f = String(i.path[0] ?? "");
    if (f && !out[f]) out[f] = i.message;
  }
  return out;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-heading text-base font-semibold">{title}</h2>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4 space-y-4">{children}</div>
    </Card>
  );
}

function PreferenceRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="min-w-0">
        <p id={id} className="text-sm font-medium">
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        aria-labelledby={id}
        className="shrink-0"
      />
    </div>
  );
}

export function ProfileView({
  me,
  departments,
}: {
  me: Alumnus;
  departments: Pick<Department, "id" | "name">[];
}) {
  const { simulate } = useDemo();

  const [saved, setSaved] = useState<EditableProfile>(() => toDraft(me));
  const [draft, setDraft] = useState<EditableProfile>(() => toDraft(me));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  // Photo uploader — validation + preview only, nothing is sent anywhere.
  const fileRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<{ url: string; name: string } | null>(
    null,
  );
  const [photoError, setPhotoError] = useState<string | null>(null);
  useEffect(() => {
    return () => {
      if (staged) URL.revokeObjectURL(staged.url);
    };
  }, [staged]);

  // Change-request dialog.
  const [crOpen, setCrOpen] = useState(false);
  const [crField, setCrField] = useState<RestrictedField>("fullName");
  const [crValue, setCrValue] = useState("");
  const [crNote, setCrNote] = useState("");
  const [crErrors, setCrErrors] = useState<Record<string, string>>({});
  const [crPending, setCrPending] = useState(false);
  const [newRequests, setNewRequests] = useState<
    { id: string; label: string; oldValue: string; newValue: string }[]
  >([]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  );

  const RESTRICTED: {
    key: RestrictedField;
    label: string;
    current: string;
  }[] = [
    { key: "fullName", label: "Full name", current: me.fullName },
    { key: "rollNumber", label: "Roll number", current: me.rollNumber },
    { key: "departmentId", label: "Department", current: me.departmentName },
    {
      key: "session",
      label: "Session",
      current: `${me.sessionStartYear}–${me.sessionEndYear}`,
    },
    {
      key: "passingYear",
      label: "Passing year",
      current: String(me.passingYear),
    },
    {
      key: "gender",
      label: "Gender",
      current: me.gender.charAt(0).toUpperCase() + me.gender.slice(1),
    },
  ];
  const activeRestricted = RESTRICTED.find((r) => r.key === crField)!;

  const set = <K extends keyof EditableProfile>(
    key: K,
    value: EditableProfile[K],
  ) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const n = { ...e };
      delete n[key];
      return n;
    });
  };

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError("That file is not a JPG or PNG — pick one of those.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(
        "That file is larger than 2 MB. Compress it, then try again.",
      );
      return;
    }
    if (staged) URL.revokeObjectURL(staged.url);
    setPhotoError(null);
    setStaged({ url: URL.createObjectURL(file), name: file.name });
  }

  async function save() {
    const result = profileEditSchema.safeParse(draft);
    if (!result.success) {
      setErrors(errorsFrom(result.error.issues));
      toast.error("Some fields need attention — see the highlighted errors.");
      return;
    }
    setSaving(true);
    await simulate(null, 550);
    setSaving(false);
    setSaved(draft);
    toast.success("Profile saved.");
  }

  async function submitChangeRequest(e: React.FormEvent) {
    e.preventDefault();
    const result = changeRequestSchema.safeParse({
      field: crField,
      newValue: crValue,
      note: crNote,
    });
    if (!result.success) {
      setCrErrors(errorsFrom(result.error.issues));
      return;
    }
    setCrPending(true);
    await simulate(null, 500);
    setCrPending(false);
    setNewRequests((rs) => [
      {
        id: `local-${Date.now()}`,
        label: activeRestricted.label,
        oldValue: activeRestricted.current,
        newValue: result.data.newValue,
      },
      ...rs,
    ]);
    setCrOpen(false);
    setCrValue("");
    setCrNote("");
    setCrErrors({});
    toast.success("Change request submitted for review.");
  }

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      <div>
        <h1 className="font-heading text-2xl font-semibold">My profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What the college and fellow alumni can see about you.
        </p>
      </div>

      {/* ── Personal ─────────────────────────────────────────────── */}
      <Section title="Personal" description="Your photo and how to reach you.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Preview box */}
          <div
            className="flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-input bg-muted/40"
            role="img"
            aria-label={
              staged ? `Preview of ${staged.name}` : "No photo chosen"
            }
          >
            {staged ? (
              // eslint-disable-next-line @next/next/no-img-element -- object-URL preview, not a remote asset
              <img
                src={staged.url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex flex-col items-center gap-1 px-2 text-center text-[10px] text-muted-foreground">
                <ImageIcon className="size-5" aria-hidden="true" />
                {me.photoPath ? "Photo on record" : "No photo"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              aria-label="Choose a profile photo"
              onChange={pickPhoto}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Camera data-icon="inline-start" aria-hidden="true" />
                {staged || me.photoPath ? "Change photo" : "Choose photo"}
              </Button>
              {staged ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    URL.revokeObjectURL(staged.url);
                    setStaged(null);
                    setPhotoError(null);
                  }}
                >
                  <Trash2 data-icon="inline-start" aria-hidden="true" />
                  Remove
                </Button>
              ) : null}
              {staged ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => toast("This will be wired in a later slice.")}
                >
                  Save photo
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              JPG or PNG, up to 2 MB.
            </p>
            {photoError ? (
              <p role="alert" className="text-xs text-destructive">
                {photoError}
              </p>
            ) : null}
          </div>
        </div>

        <FormField label="Phone" error={errors.phone}>
          {(id, describedBy) => (
            <Input
              id={id}
              type="tel"
              autoComplete="tel"
              value={draft.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+92 300 0000000…"
              aria-describedby={describedBy}
              aria-invalid={errors.phone ? true : undefined}
            />
          )}
        </FormField>

        <FormField
          label="Short bio"
          error={errors.bio}
          hint="A few lines for the alumni directory."
        >
          {(id, describedBy) => (
            <>
              <Textarea
                id={id}
                value={draft.bio}
                onChange={(e) => set("bio", e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="What you do now, in a sentence or two…"
                aria-describedby={describedBy}
                aria-invalid={errors.bio ? true : undefined}
              />
              <p
                className="text-right text-xs text-muted-foreground"
                aria-live="polite"
              >
                {draft.bio.length.toLocaleString()} / 1,000
              </p>
            </>
          )}
        </FormField>
      </Section>

      {/* ── Academic (restricted) ────────────────────────────────── */}
      <Section
        title="Academic record"
        description="Verified against the college register — ask staff to correct these."
      >
        <dl className="divide-y divide-border">
          {RESTRICTED.map((f) => (
            <div
              key={f.key}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <dt className="text-sm text-muted-foreground">{f.label}</dt>
              <dd className="flex items-center gap-2 text-sm font-medium">
                <Lock
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className={f.key === "rollNumber" ? "font-mono" : ""}>
                  {f.current}
                </span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCrOpen(true)}
          >
            Request a change
          </Button>
          <Link
            href="/design/demo/alumni/requests"
            className="text-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
          >
            My change requests
          </Link>
        </div>
        {newRequests.length > 0 ? (
          <ul className="space-y-2 border-t pt-3">
            {newRequests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span>
                  {r.label}:{" "}
                  <span className="text-muted-foreground line-through">
                    {r.oldValue}
                  </span>{" "}
                  → <span className="font-medium">{r.newValue}</span>
                </span>
                <Badge className="bg-warning text-warning-foreground">
                  <Clock className="size-3" aria-hidden="true" />
                  Pending
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      {/* ── Location & work ──────────────────────────────────────── */}
      <Section title="Location and work">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="City" error={errors.city}>
            {(id, describedBy) => (
              <Input
                id={id}
                value={draft.city}
                onChange={(e) => set("city", e.target.value)}
                aria-describedby={describedBy}
                aria-invalid={errors.city ? true : undefined}
              />
            )}
          </FormField>
          <FormField label="District" error={errors.district}>
            {(id, describedBy) => (
              <Input
                id={id}
                value={draft.district}
                onChange={(e) => set("district", e.target.value)}
                aria-describedby={describedBy}
                aria-invalid={errors.district ? true : undefined}
              />
            )}
          </FormField>
          <FormField label="Country" error={errors.country}>
            {(id, describedBy) => (
              <Input
                id={id}
                value={draft.country}
                onChange={(e) => set("country", e.target.value)}
                aria-describedby={describedBy}
                aria-invalid={errors.country ? true : undefined}
              />
            )}
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Employer" error={errors.employer}>
            {(id, describedBy) => (
              <Input
                id={id}
                value={draft.employer}
                onChange={(e) => set("employer", e.target.value)}
                aria-describedby={describedBy}
                aria-invalid={errors.employer ? true : undefined}
              />
            )}
          </FormField>
          <FormField label="Job title" error={errors.jobTitle}>
            {(id, describedBy) => (
              <Input
                id={id}
                value={draft.jobTitle}
                onChange={(e) => set("jobTitle", e.target.value)}
                aria-describedby={describedBy}
                aria-invalid={errors.jobTitle ? true : undefined}
              />
            )}
          </FormField>
          <FormField label="Sector" error={errors.sector}>
            {(id, describedBy) => (
              <Input
                id={id}
                value={draft.sector}
                onChange={(e) => set("sector", e.target.value)}
                aria-describedby={describedBy}
                aria-invalid={errors.sector ? true : undefined}
              />
            )}
          </FormField>
        </div>
      </Section>

      {/* ── Social links ─────────────────────────────────────────── */}
      <Section title="Social links">
        <FormField
          label="LinkedIn"
          error={errors.linkedin}
          hint="Full link, e.g. https://www.linkedin.com/in/you"
        >
          {(id, describedBy) => (
            <Input
              id={id}
              type="url"
              inputMode="url"
              spellCheck={false}
              value={draft.linkedin}
              onChange={(e) => set("linkedin", e.target.value)}
              placeholder="https://www.linkedin.com/in/…"
              aria-describedby={describedBy}
              aria-invalid={errors.linkedin ? true : undefined}
            />
          )}
        </FormField>
      </Section>

      {/* ── Preferences ──────────────────────────────────────────── */}
      <Section
        title="Preferences"
        description="These control what other alumni and mentors can see."
      >
        <PreferenceRow
          id="pref-mentor"
          label="Available as a mentor"
          hint="Students and junior alumni may reach out through the college."
          checked={draft.mentorAvailable}
          onChange={(v) => set("mentorAvailable", v)}
        />
        <PreferenceRow
          id="pref-directory"
          label="List me in the alumni directory"
          hint="Your name, department and year appear in the directory."
          checked={draft.directoryVisible}
          onChange={(v) => set("directoryVisible", v)}
        />
        <PreferenceRow
          id="pref-email"
          label="Show my email"
          hint="Other verified alumni can see your email address."
          checked={draft.showEmail}
          onChange={(v) => set("showEmail", v)}
        />
        <PreferenceRow
          id="pref-phone"
          label="Show my phone number"
          hint="Other verified alumni can see your phone number."
          checked={draft.showPhone}
          onChange={(v) => set("showPhone", v)}
        />
      </Section>

      {/* Inline actions — desktop; the fixed bar below covers mobile. */}
      <div className="hidden items-center justify-end gap-2 sm:flex">
        {dirty ? (
          <span className="mr-auto flex items-center gap-1.5 text-xs text-warning-foreground">
            <TriangleAlert className="size-3.5" aria-hidden="true" />
            You have unsaved changes
          </span>
        ) : null}
        <Button
          variant="outline"
          disabled={!dirty || saving}
          onClick={() => setDiscardOpen(true)}
        >
          Discard
        </Button>
        <Button onClick={save} loading={saving} disabled={!dirty}>
          Save changes
        </Button>
      </div>

      {/* Sticky action bar — mobile only */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur-sm sm:hidden">
        {dirty ? (
          <p className="mb-2 flex items-center gap-1.5 text-xs text-warning-foreground">
            <TriangleAlert className="size-3.5" aria-hidden="true" />
            Unsaved changes
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={!dirty || saving}
            onClick={() => setDiscardOpen(true)}
          >
            Discard
          </Button>
          <Button
            className="flex-1"
            onClick={save}
            loading={saving}
            disabled={!dirty}
          >
            Save changes
          </Button>
        </div>
      </div>

      {/* Discard guard */}
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard unsaved changes?"
        description="The fields go back to their last saved values. This cannot be undone."
        confirmLabel="Discard changes"
        destructive
        onConfirm={() => {
          setDraft(saved);
          setErrors({});
          setDiscardOpen(false);
        }}
      />

      {/* Request-a-change dialog */}
      <Dialog open={crOpen} onOpenChange={setCrOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a change</DialogTitle>
            <DialogDescription>
              Academic fields are verified against the college register, so
              corrections are reviewed by staff before they apply.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitChangeRequest} className="space-y-4">
            <FormField label="Field to correct" required>
              {(id) => (
                <Select<RestrictedField>
                  value={crField}
                  onValueChange={(v) => {
                    setCrField(v as RestrictedField);
                    setCrValue("");
                    setCrErrors({});
                  }}
                >
                  <SelectTrigger id={id} className="w-full">
                    <span className="flex-1 text-left">
                      {activeRestricted.label}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {RESTRICTED.map((f) => (
                      <SelectItem key={f.key} value={f.key}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>

            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Current value: </span>
              <span className="font-medium">{activeRestricted.current}</span>
            </div>

            {crField === "departmentId" ? (
              <FormField
                label="Correct department"
                required
                error={crErrors.newValue}
              >
                {(id, describedBy) => (
                  <Select
                    value={crValue}
                    onValueChange={(v) => setCrValue(String(v))}
                  >
                    <SelectTrigger
                      id={id}
                      className="w-full"
                      aria-describedby={describedBy}
                      aria-invalid={crErrors.newValue ? true : undefined}
                    >
                      <span className="flex-1 text-left">
                        {crValue || "Choose the right department…"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            ) : (
              <FormField
                label="Correct value"
                required
                error={crErrors.newValue}
                hint={
                  crField === "session"
                    ? "Use the format 2019–2023."
                    : undefined
                }
              >
                {(id, describedBy) => (
                  <Input
                    id={id}
                    value={crValue}
                    onChange={(e) => setCrValue(e.target.value)}
                    placeholder={
                      crField === "passingYear"
                        ? "e.g. 2023"
                        : "Enter the correct value…"
                    }
                    aria-describedby={describedBy}
                    aria-invalid={crErrors.newValue ? true : undefined}
                    maxLength={120}
                  />
                )}
              </FormField>
            )}

            <FormField label="Note for staff (optional)" error={crErrors.note}>
              {(id, describedBy) => (
                <Textarea
                  id={id}
                  value={crNote}
                  onChange={(e) => setCrNote(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Anything that helps staff verify — e.g. name on the result card."
                  aria-describedby={describedBy}
                  aria-invalid={crErrors.note ? true : undefined}
                />
              )}
            </FormField>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={crPending}
                onClick={() => setCrOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={crPending}>
                Submit request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
