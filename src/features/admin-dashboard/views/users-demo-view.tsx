"use client";

/**
 * Staff users demo view — mirrors the built /admin/users screen
 * (src/components/admin/users-view.tsx) anatomy: email banner, toolbar,
 * DataTable, invite/edit dialogs, confirm dialogs, row actions.
 * Actions are local stubs (useState + simulate + toast) — the real view
 * calls server actions internally, which a fixture-only demo must not.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Search, UserPlus, UsersRound } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { InlineAlert } from "@/components/shared/inline-alert";
import { UserStatusBadge } from "@/components/shared/user-status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  RowActions,
  type RowActionItem,
} from "@/components/shared/row-actions";
import { DemoForbidden } from "@/components/demo/demo-shells";
import { useDemo } from "@/components/demo/demo-provider";
import { adminRouteAllowed } from "@/features/_shared/personas";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { ROLE_LABELS } from "@/lib/constants/roles";
import type { StaffUserRow } from "@/components/admin/users-view";

const ANY = "__any__";
const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "viewer", label: "Viewer" },
  { value: "superadmin", label: "Super Admin" },
];
type StaffRoleOption = "admin" | "viewer" | "superadmin";

/** Invite dialog: name + email + role (+ explicit superadmin confirm). */
function InviteDialog({
  open,
  onOpenChange,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pending: boolean;
  onSubmit: (name: string, email: string, role: StaffRoleOption) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRoleOption>("admin");
  const [confirmSuper, setConfirmSuper] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fresh state each time the dialog opens — adjust state during render.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName("");
      setEmail("");
      setRole("admin");
      setConfirmSuper(false);
      setErrors({});
    }
  }

  function submit() {
    const next: Record<string, string> = {};
    if (name.trim().length < 3) next.name = "Give the full name.";
    if (!email.includes("@")) next.email = "Give a valid email address.";
    if (role === "superadmin" && !confirmSuper)
      next.role = "Confirm that you understand the access this grants.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit(name.trim(), email.trim(), role);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite staff</DialogTitle>
          <DialogDescription>
            They receive an email with a link to set their password. The link is
            valid for 72 hours.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Name" required error={errors.name}>
            {(id, describedBy) => (
              <Input
                id={id}
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((er) => ({ ...er, name: "" }));
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
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((er) => ({ ...er, email: "" }));
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
                onValueChange={(v) => setRole(v as StaffRoleOption)}
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
          <Button type="button" loading={pending} onClick={submit}>
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Edit dialog: name + role. */
function EditDialog({
  user,
  onOpenChange,
  pending,
  onSubmit,
}: {
  user: StaffUserRow;
  onOpenChange: (o: boolean) => void;
  pending: boolean;
  onSubmit: (name: string, role: StaffRoleOption) => void;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<StaffRoleOption>(
    user.role === "alumni" ? "viewer" : user.role,
  );
  const [confirmSuper, setConfirmSuper] = useState(false);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {user.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Name" required>
            {(id) => (
              <Input
                id={id}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />
            )}
          </FormField>
          <FormField label="Role" required>
            {(id) => (
              <Select
                value={role}
                onValueChange={(v) => setRole(v as StaffRoleOption)}
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
            loading={pending}
            onClick={() => name.trim() && onSubmit(name.trim(), role)}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersDemoView({
  rows: initialRows,
  currentUserId,
  emailMode,
}: {
  rows: StaffUserRow[];
  currentUserId: string | null;
  emailMode: "off" | "log" | "smtp";
}) {
  const { persona, simulate } = useDemo();
  const [rows, setRows] = useState(initialRows);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState(ANY);
  const [statusFilter, setStatusFilter] = useState(ANY);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<StaffUserRow | null>(null);
  const [confirm, setConfirm] = useState<{
    user: StaffUserRow;
    kind: "deactivate" | "reactivate";
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [dialogPending, setDialogPending] = useState(false);

  if (!adminRouteAllowed(persona, "/admin/users")) return <DemoForbidden />;

  const activeSuperadmins = rows.filter(
    (u) => u.role === "superadmin" && u.status === "active",
  ).length;

  const needle = q.trim().toLowerCase();
  const filtered = rows.filter((u) => {
    if (needle && !`${u.name} ${u.email}`.toLowerCase().includes(needle))
      return false;
    if (roleFilter !== ANY && u.role !== roleFilter) return false;
    if (statusFilter !== ANY && u.status !== statusFilter) return false;
    return true;
  });

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
          await simulate(null, 450);
          toast.success("Invitation queued");
        },
      },
      {
        key: "reset",
        label: "Send password reset",
        disabled: u.status !== "active",
        disabledReason:
          u.status === "invited" ? "Use resend invitation" : undefined,
        onSelect: async () => {
          await simulate(null, 450);
          toast.success("Reset link queued");
        },
      },
    ];
  }

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
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (u) => (
        <RowActions label={`Actions for ${u.name}`} items={rowItems(u)} />
      ),
    },
  ];

  async function submitInvite(
    name: string,
    email: string,
    role: StaffRoleOption,
  ) {
    setDialogPending(true);
    await simulate(null, 550);
    setRows((rs) => [
      ...rs,
      {
        id: `staff-demo-${rs.length + 1}`,
        name,
        email,
        role,
        status: "invited",
        lastLoginAt: null,
        createdAt: "2026-11-24",
      },
    ]);
    setDialogPending(false);
    setInviteOpen(false);
    toast.success(`${name} invited`);
  }

  async function submitEdit(name: string, role: StaffRoleOption) {
    if (!editUser) return;
    setDialogPending(true);
    await simulate(null, 500);
    setRows((rs) =>
      rs.map((u) => (u.id === editUser.id ? { ...u, name, role } : u)),
    );
    setDialogPending(false);
    setEditUser(null);
    toast.success("Changes saved");
  }

  async function runConfirm() {
    if (!confirm) return;
    setPending(true);
    await simulate(null, 500);
    const active = confirm.kind === "reactivate";
    setRows((rs) =>
      rs.map((u) =>
        u.id === confirm.user.id
          ? { ...u, status: active ? "active" : "inactive" }
          : u,
      ),
    );
    setPending(false);
    setConfirm(null);
    toast.success(
      `${confirm.user.name} ${active ? "reactivated" : "deactivated"}`,
    );
  }

  const roleLabel =
    roleFilter === ANY
      ? "All roles"
      : (ROLE_OPTIONS.find((o) => o.value === roleFilter)?.label ?? "Role");
  const statusLabel =
    statusFilter === ANY
      ? "All statuses"
      : statusFilter[0].toUpperCase() + statusFilter.slice(1);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Staff users"
        description="Invite staff, assign roles, and manage access."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus data-icon="inline-start" aria-hidden="true" />
            Invite staff
          </Button>
        }
      />

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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
            aria-label="Search staff users"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(String(v))}
          >
            <SelectTrigger className="min-w-36" aria-label="Filter by role">
              <span className="flex-1 text-left">{roleLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All roles</SelectItem>
              {ROLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
              <SelectItem value="alumni">Alumni</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(String(v))}
          >
            <SelectTrigger className="min-w-36" aria-label="Filter by status">
              <span className="flex-1 text-left">{statusLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        caption="Staff users"
        empty={
          <EmptyState
            icon={UsersRound}
            title="No staff users match"
            description="Adjust the search or filters to find who you need."
          />
        }
      />

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        pending={dialogPending}
        onSubmit={submitInvite}
      />
      {editUser ? (
        <EditDialog
          user={editUser}
          onOpenChange={(o) => !o && setEditUser(null)}
          pending={dialogPending}
          onSubmit={submitEdit}
        />
      ) : null}
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && !pending && setConfirm(null)}
        title={`${confirm?.kind === "deactivate" ? "Deactivate" : "Reactivate"} ${confirm?.user.name ?? ""}?`}
        description={
          confirm?.kind === "deactivate"
            ? `${confirm.user.name} will be signed out everywhere and cannot sign in until reactivated.`
            : `${confirm?.user.name ?? ""} will be able to sign in again.`
        }
        confirmLabel={`${confirm?.kind === "deactivate" ? "Deactivate" : "Reactivate"} ${confirm?.user.name ?? ""}`}
        destructive={confirm?.kind === "deactivate"}
        pending={pending}
        onConfirm={runConfirm}
      />
    </div>
  );
}
