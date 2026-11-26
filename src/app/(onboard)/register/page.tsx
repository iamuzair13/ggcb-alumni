import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";
import { RegisterHero } from "@/components/auth/register-hero";
import { listDepartments } from "@/server/services/departments";

export const metadata: Metadata = { title: "Register" };

/** Departments come from the DB on each request — blocking, not prerendered. */
export const instant = false;

/**
 * Registration desk — story panel on the left (the payoff: verified E-card),
 * the stepper form full-width on the right. Mobile stacks panel over form.
 */
export default async function RegisterPage() {
  const departments = await listDepartments();
  return (
    <div className="grid flex-1 lg:grid-cols-[2fr_3fr]">
      <RegisterHero />
      <section className="px-5 py-8 sm:px-10 lg:py-12">
        <div className="mx-auto w-full max-w-xl space-y-5">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
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
      </section>
    </div>
  );
}
