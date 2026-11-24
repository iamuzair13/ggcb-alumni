/**
 * Role constants — string unions only, no DB dependency (context.md §1).
 * The single RBAC layer is a role enum on the user record.
 */
export const ROLES = ["superadmin", "admin", "viewer", "alumni"] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES = ["superadmin", "admin", "viewer"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  viewer: "Viewer",
  alumni: "Alumni",
};
