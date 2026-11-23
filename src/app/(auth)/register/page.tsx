import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const metadata: Metadata = { title: "Register" };

/**
 * Static form skeleton only — registration flow (existence check → create →
 * verify email) is wired in a later phase. No <form> element on purpose.
 */
export default function RegisterPage() {
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
      <div className="space-y-4">
        <FormField label="Full name" required>
          {(id, describedBy) => (
            <Input
              id={id}
              name="fullName"
              autoComplete="name"
              placeholder="Your full name…"
              aria-describedby={describedBy}
            />
          )}
        </FormField>
        <FormField label="Roll number" required>
          {(id, describedBy) => (
            <Input
              id={id}
              name="rollNumber"
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. 2019-BS-001…"
              aria-describedby={describedBy}
            />
          )}
        </FormField>
        <FormField label="Department" required>
          {(id) => (
            <Select>
              <SelectTrigger id={id} className="w-full">
                <SelectValue placeholder="Select your department…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>
                  Departments are configured by the college
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField label="Email" required>
          {(id, describedBy) => (
            <Input
              id={id}
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="you@example.com…"
              aria-describedby={describedBy}
            />
          )}
        </FormField>
        <Button className="w-full" disabled>
          Create account
        </Button>
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
    </div>
  );
}
