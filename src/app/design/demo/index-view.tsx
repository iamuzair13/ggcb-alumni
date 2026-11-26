"use client";

/**
 * Prototype index — the map of the whole product. Links open the demo
 * shells; the persona switcher decides which fixture slice is shown.
 */
import Link from "next/link";
import { Building2, Globe, LayoutDashboard, ShieldCheck } from "lucide-react";
import {
  ADMIN_DEMO_ROUTES,
  ALUMNI_DEMO_ROUTES,
} from "@/features/_shared/personas";
import { Card } from "@/components/ui/card";
import { PersonaSwitcher } from "@/components/demo/persona-switcher";
import { useDemo } from "@/components/demo/demo-provider";

const PUBLIC_LINKS = [
  { href: "/design/demo/public/register", label: "Register" },
  { href: "/design/demo/public/check-email", label: "Check your email" },
  { href: "/design/demo/public/verify", label: "E-card verification" },
];

const ADMIN_LABELS: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/alumni": "Alumni directory",
  "/admin/departments": "Departments",
  "/admin/content": "Content",
  "/admin/import-export": "Import / Export",
  "/admin/analytics": "Analytics",
  "/admin/users": "Staff users",
  "/admin/audit-logs": "Audit logs",
};

const ALUMNI_LABELS: Record<string, string> = {
  "/alumni/dashboard": "Dashboard (all 3 states)",
  "/alumni/profile": "My profile",
  "/alumni/requests": "My change requests",
  "/alumni/e-card": "E-card",
  "/alumni/events": "Events",
  "/alumni/announcements": "Announcements",
  "/alumni/opportunities": "Opportunities",
  "/alumni/stories": "Stories",
  "/alumni/account": "Account",
};

function Column({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof Globe;
  title: string;
  items: { href: string; label: string }[];
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        <h2 className="font-heading text-base font-semibold">{title}</h2>
      </div>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function DemoIndex() {
  const { persona } = useDemo();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        GGCB Alumni Portal — clickable prototype
      </p>
      <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
        Every screen, wired to fixtures
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Browse the product end to end. The persona switcher changes which state
        you see — it is client-side demo state only and never touches real
        permissions. Every name, email and record here is synthetic.
      </p>

      <div className="mt-6 flex items-center gap-3 rounded-lg border bg-card p-4">
        <PersonaSwitcher />
        <p className="hidden text-xs text-muted-foreground sm:block">
          {persona.description}
        </p>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <Column icon={Globe} title="Public" items={PUBLIC_LINKS} />
        <Column
          icon={LayoutDashboard}
          title="Alumni area"
          items={ALUMNI_DEMO_ROUTES.map((r) => ({
            href: `/design/demo${r.path}`,
            label: ALUMNI_LABELS[r.path] ?? r.path,
          }))}
        />
        <Column
          icon={Building2}
          title="Admin area"
          items={ADMIN_DEMO_ROUTES.map((r) => ({
            href: `/design/demo${r.path}`,
            label: ADMIN_LABELS[r.path] ?? r.path,
          }))}
        />
      </div>

      <Card className="mt-8 border-dashed p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
          What to try first
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Switch to “Alumnus — verified” → Dashboard → E-card.</li>
          <li>
            Switch to “Alumnus — under approval” → Dashboard status, then open
            any other alumni page to see the 403.
          </li>
          <li>
            Switch to “Staff — admin” → Alumni → pick rows → bulk
            approve/reject.
          </li>
          <li>Import / Export → run the five-step stepper end to end.</li>
          <li>Analytics → toggle “View as table” on any chart.</li>
        </ul>
      </Card>
    </main>
  );
}
