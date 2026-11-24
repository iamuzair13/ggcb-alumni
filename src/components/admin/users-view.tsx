"use client";

/**
 * Staff users view — /admin/users (blueprint §2 anatomy). Plain props only
 * (serialized rows, ids, flags); server actions are called directly.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { UserStatusBadge } from "@/components/shared/user-status-badge";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  RowActions,
  type RowActionItem,
} from "@/components/shared/row-actions";
import { InlineAlert } from "@/components/shared/inline-alert";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import {
  inviteStaffAction,
  updateStaffAction,
  setStaffActiveAction,
  resendInvitationAction,
  sendPasswordResetAction,
} from "@/lib/actions/staff";
import type { UserStatus } from "@/lib/result";
import type { Role } from "@/lib/constants/roles";
import { ROLE_LABELS } from "@/lib/constants/roles";

export interface StaffUserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

const FILTERS = [
  {
    key: "role",
    label: "Role",
    options: [
      { value: "superadmin", label: "Super Admin" },
      { value: "admin", label: "Admin" },
      { value: "viewer", label: "Viewer" },
      { value: "alumni", label: "Alumni" },
    ],
  },
  {
    key: "status",
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "invited", label: "Invited" },
      { value: "inactive", label: "Inactive" },
    ],
  },
];

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "viewer", label: "Viewer" },
  { value: "superadmin", label: "Super Admin" },
];

export function UsersView({
  rows,
  currentUserId,
  activeSuperadmins,
  emailMode,
  canWrite = true,
}: {
  rows: StaffUserRow[];
  currentUserId: string | null;
  /** Count of active superadmins — last-superadmin guard mirrors server. */
  activeSuperadmins: number;
  emailMode: "off" | "log" | "smtp";
  canWrite?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<StaffUserRow | null>(null);
  const [confirm, setConfirm] = useState<{
    user: StaffUserRow;
    kind: "deactivate" | "reactivate";
  } | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  const refresh = () => startTransition(() => router.refresh());

  function rowItems(u: StaffUserRow): RowActionItem[] {
    const self = u.id === currentUserId;
    const lastSuper = u.role === "superadmin" && activeSuperadmins <= 1;
    return [
      { key: "edit", label: "Edit…", onSelect: () => setEditUser(u) },
      u.status !== "inactive"
        ? {
            key: "deactivate",
            label: "Deactivate…",
            destructive: true,
            disabled: self || lastSuper,
            disabledReason: self
              ? "Your own account"
              : lastSuper
                ? "Last superadmin"
                : undefined,
            onSelect: () => setConfirm({ user: u, kind: "deactivate" }),
          }
        : {
            key: "reactivate",
            label: "Reactivate…",
            onSelect: () => setConfirm({ user: u, kind: "reactivate" }),
          },
      {
        key: "resend",
        label: "Resend invitation",
        disabled: u.status !== "invited",
        disabledReason: u.status === "invited" ? undefined : "Has a password",
        onSelect: async () => {
          const r = await resendInvitationAction({ id: u.id });
          toastIf(r.ok && r.data.status === "ok", "Invitation queued", r);
          refresh();
        },
      },
      {
        key: "reset",
        label: "Send password reset",
        disabled: u.status !== "active",
        disabledReason:
          u.status === "invited" ? "Use resend invitation" : undefined,
        onSelect: async () => {
          const r = await sendPasswordResetAction({ id: u.id });
          toastIf(r.ok && r.data.status === "ok", "Reset link queued", r);
          refresh();
        },
      },
    ];
  }

  // Plain derivation — building column descriptors is cheaper than
  // memoising the closure over rowItems.
  const columns: DataTableColumn<StaffUserRow>[] = [
    {
      key: "name",
      header: "Name",
      cell: (u) => (
        <span className="font-medium">
          {u.name}
          {u.id === currentUserId ? (
            <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
          ) : null}
        </span>
      ),
    },
    { key: "email", header: "Email", cell: (u) => u.email },
    { key: "role", header: "Role", cell: (u) => ROLE_LABELS[u.role] },
    {
      key: "status",
      header: "Status",
      cell: (u) => <UserStatusBadge status={u.status} />,
    },
    {
      key: "last",
      header: "Last login",
      cell: (u) => (u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"),
    },
    { key: "created", header: "Created", cell: (u) => formatDate(u.createdAt) },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            className: "text-right",
            cell: (u: StaffUserRow) => (
              <RowActions label={`Actions for ${u.name}`} items={rowItems(u)} />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {emailMode === "off" ? (
        <InlineAlert variant="warning" title="Email is not configured">
          Invitations and reset links are queued but not delivered until SMTP is
          configured. Tell the owner the outbox is filling.
        </InlineAlert>
      ) : emailMode === "log" ? (
        <InlineAlert variant="info" title="Dev email mode">
          Emails are printed to the server console instead of being sent — copy
          the link from the console to test the flow.
        </InlineAlert>
      ) : null}

      <ListToolbar
        searchPlaceholder="Search name or email…"
        filters={FILTERS}
      />

      <DataTable
        columns={columns}
        rows={rows}
        caption="Staff users"
        empty={
          <EmptyState
            icon={UsersRound}
            title="No staff users match"
            description="Adjust the search or filters to find who you need."
          />
        }
      />

      {canWrite ? (
        <>
          <InviteDialog
            open={inviteOpen}
            onOpenChange={setInviteOpen}
            onDone={refresh}
          />
          {editUser ? (
            <EditDialog
              user={editUser}
              onOpenChange={(o) => !o && setEditUser(null)}
              onDone={refresh}
            />
          ) : null}
          {confirm ? (
            <ConfirmDialog
              open
              onOpenChange={(o) => !o && setConfirm(null)}
              title={`${confirm.kind === "deactivate" ? "Deactivate" : "Reactivate"} ${confirm.user.name}?`}
              description={
                confirm.kind === "deactivate"
                  ? `${confirm.user.name} will be signed out everywhere and cannot sign in until reactivated.`
                  : `${confirm.user.name} will be able to sign in again.`
              }
              confirmLabel={`${confirm.kind === "deactivate" ? "Deactivate" : "Reactivate"} ${confirm.user.name}`}
              destructive={confirm.kind === "deactivate"}
              pending={confirmPending}
              onConfirm={async () => {
                setConfirmPending(true);
                const r = await setStaffActiveAction({
                  id: confirm.user.id,
                  active: confirm.kind === "reactivate",
                });
                setConfirmPending(false);
                if (r.ok && r.data.status === "ok") {
                  toast.success(
                    confirm.kind === "deactivate"
                      ? "Deactivated"
                      : "Reactivated",
                  );
                  setConfirm(null);
                  refresh();
                } else {
                  toast.error(
                    !r.ok
                      ? r.message
                      : r.data.status === "error"
                        ? r.data.message
                        : "Something went wrong",
                  );
                }
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Self-contained "Invite staff" primary action — button + dialog. */
export function InviteStaffButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus data-icon="inline-start" aria-hidden="true" />
        Invite staff
      </Button>
      <InviteDialog
        open={open}
        onOpenChange={setOpen}
        onDone={() => router.refresh()}
      />
    </>
  );
}

function toastIf(
  ok: boolean,
  okMsg: string,
  r: {
    ok: boolean;
    data?: { status?: string; message?: string };
    message?: string;
  },
) {
  if (ok) {
    toast.success(okMsg);
  } else {
    const msg = r.ok
      ? ((r.data?.status === "error" ? r.data.message : undefined) ??
        "Something went wrong")
      : (r.message ?? "Something went wrong");
    toast.error(msg);
  }
}

/** Invite dialog: name + email + role (+ explicit superadmin confirm). */
export function InviteDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "viewer" | "superadmin">("admin");
  const [confirmSuper, setConfirmSuper] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setName("");
          setEmail("");
          setRole("admin");
          setConfirmSuper(false);
        }
      }}
      title="Invite staff"
      description="They receive an email with a link to set their password. The link is valid for 72 hours."
      submitLabel="Send invitation"
      pendingLabel="Inviting…"
      action={inviteStaffAction}
      buildInput={() => ({
        name,
        email,
        role,
        confirmSuperadmin: confirmSuper,
      })}
      onSuccess={onDone}
    >
      {(errors, clearError) => (
        <>
          <FormField label="Name" required error={errors.name}>
            {(id, describedBy) => (
              <Input
                id={id}
                name="name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
                autoComplete="off"
                aria-describedby={describedBy}
                aria-invalid={errors.name ? true : undefined}
              />
            )}
          </FormField>
          <FormField label="Email" required error={errors.email}>
            {(id, describedBy) => (
              <Input
                id={id}
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
                autoComplete="off"
                spellCheck={false}
                aria-describedby={describedBy}
                aria-invalid={errors.email ? true : undefined}
              />
            )}
          </FormField>
          <FormField
            label="Role"
            required
            error={errors.role}
            hint="Viewer: read-only. Admin: alumni + content. Super Admin: everything incl. staff users."
          >
            {(id) => (
              <Select
                value={role}
                onValueChange={(v) => setRole(v as typeof role)}
              >
                <SelectTrigger id={id} className="w-full">
                  <span className="flex-1 text-left">
                    {ROLE_OPTIONS.find((o) => o.value === role)?.label}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          {role === "superadmin" ? (
            <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
              <Checkbox
                id="confirm-super"
                checked={confirmSuper}
                onCheckedChange={(v) => setConfirmSuper(v === true)}
                aria-labelledby="confirm-super-label"
              />
              <span id="confirm-super-label" className="text-sm">
                I understand this grants full access, including staff
                management.
              </span>
            </div>
          ) : null}
        </>
      )}
    </FormDialog>
  );
}

/** Edit dialog: name + role. */
export function EditDialog({
  user,
  onOpenChange,
  onDone,
}: {
  user: StaffUserRow;
  onOpenChange: (o: boolean) => void;
  onDone?: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<"admin" | "viewer" | "superadmin">(
    user.role === "alumni" ? "viewer" : user.role,
  );
  const [confirmSuper, setConfirmSuper] = useState(false);
  const selfNote = user.role === "superadmin";

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={`Edit ${user.name}`}
      submitLabel="Save changes"
      pendingLabel="Saving…"
      action={updateStaffAction}
      buildInput={() => ({
        id: user.id,
        name,
        role,
        confirmSuperadmin: confirmSuper,
      })}
      onSuccess={onDone}
    >
      {(errors, clearError) => (
        <>
          <FormField label="Name" required error={errors.name}>
            {(id, describedBy) => (
              <Input
                id={id}
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
                aria-describedby={describedBy}
                aria-invalid={errors.name ? true : undefined}
              />
            )}
          </FormField>
          <FormField
            label="Role"
            required
            error={errors.role}
            hint={
              selfNote
                ? "Changing a superadmin role may be restricted by safety rules."
                : undefined
            }
          >
            {(id) => (
              <Select
                value={role}
                onValueChange={(v) => setRole(v as typeof role)}
              >
                <SelectTrigger id={id} className="w-full">
                  <span className="flex-1 text-left">
                    {ROLE_OPTIONS.find((o) => o.value === role)?.label}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          {role === "superadmin" && user.role !== "superadmin" ? (
            <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
              <Checkbox
                id="confirm-super-edit"
                checked={confirmSuper}
                onCheckedChange={(v) => setConfirmSuper(v === true)}
                aria-labelledby="confirm-super-edit-label"
              />
              <span id="confirm-super-edit-label" className="text-sm">
                I understand this grants full access, including staff
                management.
              </span>
            </div>
          ) : null}
        </>
      )}
    </FormDialog>
  );
}
