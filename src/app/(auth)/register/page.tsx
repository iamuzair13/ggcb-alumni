import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";
import { listDepartments } from "@/server/services/departments";

export const metadata: Metadata = { title: "Register" };

/** Departments come from the DB on each request — blocking, not prerendered. */
export const instant = false;

/**
 * Full registration form — all alumni fields (mandatory + optional).
 * The submit seam inside the form is a stub until the real registration
 * action lands (existence check → create → verify email).
 */
export default async function RegisterPage() {
  const departments = await listDepartments();
  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Register as alumni
        </h1>
        <p className="text-sm text-muted-foreground">
          For graduates of GGCB BS programs. Registration is reviewed by the
          college before activation.
        </p>
      </div>
      <RegisterForm
        departments={departments
          .filter((d) => d.is_active)
          .map((d) => ({ id: d.id, name: d.name }))}
      />
    </div>
  );
}
