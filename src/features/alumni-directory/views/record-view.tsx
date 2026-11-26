"use client";

/**
 * Admin alumnus record (demo) — read view grouped into register sections,
 * an edit mode over the alumnus-editable fields, and a pending
 * change-request review panel. Mutations are local state + simulate().
 */
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  IdCard,
  PencilLine,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { DiffTable } from "@/components/shared/diff-table";
import { InlineAlert } from "@/components/shared/inline-alert";
import { StatusBadge } from "@/components/shared/status-badge";
import { DemoForbidden } from "@/components/demo/demo-shells";
import { useDemo } from "@/components/demo/demo-provider";
import { adminRouteAllowed } from "@/features/_shared/personas";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

import type { Alumnus, AlumniChangeRequest, Ecard } from "../types";

const DEMO_BASE = "/design/demo";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function DefList({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 text-sm sm:grid-cols-[9rem_1fr]">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </Card>
  );
}

/** Editable draft — the alumnus-editable fields (academic stays fixed). */
interface Draft {
  fullName: string;
  email: string;
  phone: string;
  gender: "male" | "female";
  bio: string;
  city: string;
  district: string;
  country: string;
  employer: string;
  jobTitle: string;
  sector: string;
  linkedin: string;
  mentorAvailable: boolean;
  directoryVisible: boolean;
  showEmail: boolean;
  showPhone: boolean;
}

function draftFrom(a: Alumnus): Draft {
  return {
    fullName: a.fullName,
    email: a.email,
    phone: a.phone ?? "",
    gender: a.gender,
    bio: a.bio ?? "",
    city: a.city ?? "",
    district: a.district ?? "",
    country: a.country ?? "",
    employer: a.employer ?? "",
    jobTitle: a.jobTitle ?? "",
    sector: a.sector ?? "",
    linkedin: a.socialLinks.linkedin ?? "",
    mentorAvailable: a.mentorAvailable,
    directoryVisible: a.directoryVisible,
    showEmail: a.showEmail,
    showPhone: a.showPhone,
  };
}

const REQ_STYLES = {
  pending: {
    icon: Clock,
    label: "Pending",
    classes: "bg-warning text-warning-foreground",
  },
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    classes: "bg-success text-success-foreground",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    classes: "bg-destructive/10 text-destructive",
  },
} as const;

export function AlumnusRecordView({
  alumnus,
  ecard,
  pendingRequest,
}: {
  alumnus: Alumnus;
  ecard: Ecard | null;
  pendingRequest: AlumniChangeRequest | null;
}) {
  const { persona, simulate } = useDemo();
  const [record, setRecord] = useState(alumnus);
  const [request, setRequest] = useState(pendingRequest);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(alumnus));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [reqNote, setReqNote] = useState("");
  const [reqBusy, setReqBusy] = useState<"approve" | "reject" | null>(null);

  if (!adminRouteAllowed(persona, "/admin/alumni")) return <DemoForbidden />;
  const canMutate = persona.role === "admin" || persona.role === "superadmin";

  function startEdit() {
    setDraft(draftFrom(record));
    setErrors({});
    setEditing(true);
  }

  async function save() {
    const next: Record<string, string> = {};
    if (draft.fullName.trim().length < 3) next.fullName = "Give the full name.";
    if (!draft.email.includes("@")) next.email = "Give a valid email.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    await simulate(null, 600);
    const { linkedin, ...rest } = draft;
    setRecord({
      ...record,
      ...rest,
      phone: draft.phone || null,
      bio: draft.bio || null,
      city: draft.city || null,
      district: draft.district || null,
      country: draft.country || null,
      employer: draft.employer || null,
      jobTitle: draft.jobTitle || null,
      sector: draft.sector || null,
      socialLinks: linkedin ? { linkedin } : {},
    });
    setSaving(false);
    setEditing(false);
    toast.success("Record updated");
  }

  async function decideRequest(decision: "approve" | "reject") {
    if (!request) return;
    setReqBusy(decision);
    await simulate(null, 550);
    setRequest({
      ...request,
      status: decision === "approve" ? "approved" : "rejected",
      reviewNote: reqNote.trim() || null,
      reviewedAt: "now",
      reviewedBy: persona.label,
    });
    setReqBusy(null);
    setReqNote("");
    toast.success(
      `Change request ${decision === "approve" ? "approved" : "rejected"}`,
    );
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  function textField(
    key: keyof Draft & string,
    label: string,
    opts: { type?: string; error?: string } = {},
  ) {
    return (
      <FormField
        label={label}
        required={key === "fullName" || key === "email"}
        error={opts.error}
      >
        {(id, describedBy) => (
          <Input
            id={id}
            type={opts.type ?? "text"}
            value={String(draft[key] ?? "")}
            onChange={(e) => {
              set(key, e.target.value as never);
              setErrors((er) => ({ ...er, [key]: "" }));
            }}
            aria-describedby={describedBy}
            aria-invalid={opts.error ? true : undefined}
          />
        )}
      </FormField>
    );
  }

  function checkField(key: keyof Draft & string, label: string) {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={`edit-${key}`}
          checked={draft[key] === true}
          onCheckedChange={(v) => set(key, (v === true) as never)}
          aria-labelledby={`edit-${key}-label`}
        />
        <Label id={`edit-${key}-label`} htmlFor={`edit-${key}`}>
          {label}
        </Label>
      </div>
    );
  }

  const reqStyle = request ? REQ_STYLES[request.status] : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`${DEMO_BASE}/admin/alumni`}
          className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to directory
        </Link>
      </div>

      <PageHeader
        title={record.fullName}
        description={`Roll number ${record.rollNumber} · ${record.departmentName} · class of ${record.passingYear}`}
        actions={
          canMutate && !editing ? (
            <Button variant="outline" onClick={startEdit}>
              <PencilLine data-icon="inline-start" aria-hidden="true" />
              Edit record
            </Button>
          ) : undefined
        }
      />

      {/* Header strip */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <Avatar size="lg">
          <AvatarFallback>{initials(record.fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={record.verifyStatus} />
            <Badge variant="secondary" className="capitalize">
              {record.datasource}
            </Badge>
            {record.isFeatured ? (
              <Badge
                variant="outline"
                className="gap-1 border-transparent bg-accent text-accent-foreground"
              >
                Featured
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Registered {formatDate(record.createdAt)}
            {ecard
              ? ` · E-card ${ecard.cardNo} — ${ecard.status}`
              : " · No E-card issued"}
          </p>
        </div>
        {ecard ? (
          <IdCard
            className={cn(
              "size-8",
              ecard.status === "active"
                ? "text-success-foreground"
                : "text-muted-foreground",
            )}
            aria-hidden="true"
          />
        ) : null}
      </div>

      {record.verifyStatus === "rejected" && record.rejectReason ? (
        <InlineAlert variant="destructive" title="Rejected">
          {record.rejectReason}
        </InlineAlert>
      ) : null}

      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-6"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Personal">
              <div className="space-y-3">
                {textField("fullName", "Full name", {
                  error: errors.fullName,
                })}
                <FormField label="Gender">
                  {(id) => (
                    <Select
                      value={draft.gender}
                      onValueChange={(v) => set("gender", v as Draft["gender"])}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="flex-1 text-left capitalize">
                          {draft.gender}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
                <FormField label="Bio">
                  {(id, describedBy) => (
                    <Textarea
                      id={id}
                      value={draft.bio}
                      onChange={(e) => set("bio", e.target.value)}
                      aria-describedby={describedBy}
                    />
                  )}
                </FormField>
              </div>
            </SectionCard>
            <SectionCard title="Contact">
              <div className="space-y-3">
                {textField("email", "Email", {
                  type: "email",
                  error: errors.email,
                })}
                {textField("phone", "Phone", { type: "tel" })}
                <div className="grid grid-cols-2 gap-3">
                  {textField("city", "City")}
                  {textField("district", "District")}
                </div>
                {textField("country", "Country")}
              </div>
            </SectionCard>
            <SectionCard title="Work">
              <div className="space-y-3">
                {textField("employer", "Employer")}
                {textField("jobTitle", "Job title")}
                {textField("sector", "Sector")}
              </div>
            </SectionCard>
            <SectionCard title="Social and preferences">
              <div className="space-y-3">
                {textField("linkedin", "LinkedIn URL", { type: "url" })}
                <div className="space-y-2 pt-1">
                  {checkField("mentorAvailable", "Available to mentor")}
                  {checkField(
                    "directoryVisible",
                    "Visible in public directory",
                  )}
                  {checkField("showEmail", "Show email publicly")}
                  {checkField("showPhone", "Show phone publicly")}
                </div>
              </div>
            </SectionCard>
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Personal">
            <DefList
              items={[
                ["Full name", record.fullName],
                ["Gender", record.gender],
                ["Bio", record.bio],
                [
                  "Featured",
                  record.isFeatured ? (record.achievement ?? "Yes") : "No",
                ],
              ]}
            />
          </SectionCard>
          <SectionCard title="Academic">
            <DefList
              items={[
                ["Roll number", record.rollNumber],
                ["Department", record.departmentName],
                ["Degree", record.degree],
                [
                  "Session",
                  `${record.sessionStartYear}–${record.sessionEndYear}`,
                ],
                ["Passing year", String(record.passingYear)],
              ]}
            />
          </SectionCard>
          <SectionCard title="Contact">
            <DefList
              items={[
                ["Email", record.email],
                ["Phone", record.phone],
                ["City", record.city],
                ["District", record.district],
                ["Country", record.country],
              ]}
            />
          </SectionCard>
          <SectionCard title="Work">
            <DefList
              items={[
                ["Employer", record.employer],
                ["Job title", record.jobTitle],
                ["Sector", record.sector],
              ]}
            />
          </SectionCard>
          <SectionCard title="Social">
            <DefList items={[["LinkedIn", record.socialLinks.linkedin]]} />
          </SectionCard>
          <SectionCard title="Preferences">
            <DefList
              items={[
                ["Mentoring", record.mentorAvailable ? "Opted in" : "No"],
                ["Directory", record.directoryVisible ? "Visible" : "Hidden"],
                ["Email shown", record.showEmail ? "Yes" : "No"],
                ["Phone shown", record.showPhone ? "Yes" : "No"],
              ]}
            />
          </SectionCard>
        </div>
      )}

      {/* Pending change-request review panel */}
      {request ? (
        <Card className="border-warning-foreground/30 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              Pending change request
            </h2>
            {reqStyle ? (
              <Badge
                variant="outline"
                className={cn("gap-1.5 border-transparent", reqStyle.classes)}
              >
                <reqStyle.icon className="size-3" aria-hidden="true" />
                {reqStyle.label}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Submitted {formatDate(request.createdAt)} — the alumnus asked to
            change restricted fields.
          </p>
          <div className="mt-4">
            <DiffTable changes={request.changes} />
          </div>
          {request.status === "pending" && canMutate ? (
            <div className="mt-4 space-y-3">
              <FormField
                label="Review note"
                hint="Optional — recorded with the decision."
              >
                {(id, describedBy) => (
                  <Textarea
                    id={id}
                    value={reqNote}
                    onChange={(e) => setReqNote(e.target.value)}
                    aria-describedby={describedBy}
                    placeholder="Checked against the register…"
                  />
                )}
              </FormField>
              <div className="flex flex-wrap gap-2">
                <Button
                  loading={reqBusy === "approve"}
                  disabled={reqBusy !== null}
                  onClick={() => decideRequest("approve")}
                >
                  <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
                  Approve change
                </Button>
                <Button
                  variant="destructive"
                  loading={reqBusy === "reject"}
                  disabled={reqBusy !== null}
                  onClick={() => decideRequest("reject")}
                >
                  <XCircle data-icon="inline-start" aria-hidden="true" />
                  Reject change
                </Button>
              </div>
            </div>
          ) : request.status === "pending" ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Waiting for staff review.
            </p>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              Reviewed {request.reviewedAt} by {request.reviewedBy ?? "staff"}
              {request.reviewNote ? ` — ${request.reviewNote}` : ""}
            </p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
