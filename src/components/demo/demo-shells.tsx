"use client";

/**
 * Demo shells — parameterised copies of the real alumni/admin chrome.
 * Links stay inside the demo via `basePath`; nav is role-filtered exactly
 * like production (cosmetic filter — the page-level persona check is the
 * demo's "guard").
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  LayoutDashboard,
  Menu,
  Newspaper,
  ScrollText,
  Settings,
  UserRound,
  Users,
  BarChart3,
  FileText,
  IdCard,
  CalendarDays,
  Megaphone,
  Briefcase,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { useDemo } from "./demo-provider";
import { PersonaSwitcher } from "./persona-switcher";
import { alumniNavFor, adminNavFor } from "@/features/_shared/personas";
import { useState } from "react";

export const DEMO_BASE = "/design/demo";

const ALUMNI_LABELS: Record<string, { label: string; icon: typeof Settings }> =
  {
    "/alumni/dashboard": { label: "Dashboard", icon: LayoutDashboard },
    "/alumni/profile": { label: "Profile", icon: UserRound },
    "/alumni/requests": { label: "Requests", icon: FileText },
    "/alumni/e-card": { label: "E-card", icon: IdCard },
    "/alumni/events": { label: "Events", icon: CalendarDays },
    "/alumni/announcements": { label: "Announcements", icon: Megaphone },
    "/alumni/opportunities": { label: "Opportunities", icon: Briefcase },
    "/alumni/stories": { label: "Stories", icon: Newspaper },
    "/alumni/account": { label: "Account", icon: Settings },
  };

const ADMIN_ICONS: Record<string, typeof Users> = {
  "/admin": LayoutDashboard,
  "/admin/alumni": Users,
  "/admin/departments": Building2,
  "/admin/content": FileText,
  "/admin/import-export": ArrowLeftRight,
  "/admin/analytics": BarChart3,
  "/admin/users": Users,
  "/admin/audit-logs": ScrollText,
};

const ADMIN_LABELS: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/alumni": "Alumni",
  "/admin/departments": "Departments",
  "/admin/content": "Content",
  "/admin/import-export": "Import/Export",
  "/admin/analytics": "Analytics",
  "/admin/users": "Users",
  "/admin/audit-logs": "Audit logs",
};

function DemoTopbar({ area }: { area: "alumni" | "admin" }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-background/95 px-4 py-2 text-xs">
      <Link
        href={DEMO_BASE}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Prototype index</span>
        <span className="sm:hidden">Index</span>
      </Link>
      <span className="hidden text-muted-foreground sm:inline">
        Demo {area === "alumni" ? "alumni area" : "admin area"}
      </span>
      <div className="ml-auto">
        <PersonaSwitcher />
      </div>
    </div>
  );
}

function MobileNavSheet({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="sm:hidden"
            aria-label={label}
          />
        }
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <nav
          className="flex flex-col gap-1 pt-8"
          onClick={() => setOpen(false)}
        >
          {children}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function DemoAlumniShell({ children }: { children: React.ReactNode }) {
  const { persona } = useDemo();
  const pathname = usePathname();
  const hrefs = alumniNavFor(persona);
  const links = hrefs.map((p) => ({
    href: `${DEMO_BASE}${p}`,
    ...ALUMNI_LABELS[p],
  }));

  const nav = (
    <>
      {links.map((l) => {
        const Icon = l.icon;
        const active = pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {l.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      <DemoTopbar area="alumni" />
      {persona.role !== "alumni" ? (
        <DemoPersonaNotice expected="an alumni persona" />
      ) : (
        <>
          <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
            <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 overflow-x-auto px-4">
              <MobileNavSheet label="Open navigation">{nav}</MobileNavSheet>
              <Link
                href={`${DEMO_BASE}/alumni/dashboard`}
                className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <Logo />
              </Link>
              <nav className="ml-auto hidden items-center gap-1 sm:flex">
                {nav}
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
            {children}
          </main>
        </>
      )}
    </>
  );
}

export function DemoAdminShell({ children }: { children: React.ReactNode }) {
  const { persona } = useDemo();
  const pathname = usePathname();
  const hrefs = adminNavFor(persona);
  const links = hrefs.map((p) => ({
    href: `${DEMO_BASE}${p}`,
    label: ADMIN_LABELS[p],
    icon: ADMIN_ICONS[p],
  }));

  const nav = (
    <>
      {links.map((l) => {
        const Icon = l.icon;
        const active =
          l.href === `${DEMO_BASE}/admin`
            ? pathname === l.href
            : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {l.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      <DemoTopbar area="admin" />
      {persona.role !== "viewer" &&
      persona.role !== "admin" &&
      persona.role !== "superadmin" ? (
        <DemoPersonaNotice expected="a staff persona" />
      ) : (
        <div className="flex min-h-[calc(100svh-76px)]">
          <aside className="hidden w-60 shrink-0 border-r bg-card md:block">
            <div className="border-b p-4">
              <Logo />
              <p className="mt-1 text-xs text-muted-foreground">
                {persona.label}
              </p>
            </div>
            <nav className="space-y-0.5 p-3">{nav}</nav>
          </aside>
          <div className="min-w-0 flex-1">
            <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm md:hidden">
              <MobileNavSheet label="Open admin navigation">
                {nav}
              </MobileNavSheet>
              <span className="text-sm font-semibold">Admin</span>
            </div>
            <main className="w-full max-w-[1280px] px-4 py-6 sm:px-6">
              {children}
            </main>
          </div>
        </div>
      )}
    </>
  );
}

export function DemoPersonaNotice({ expected }: { expected: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-lg font-semibold">Switch to {expected}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        This area belongs to a different role. Pick {expected} in the switcher
        above — it never changes real permissions.
      </p>
    </div>
  );
}

export function DemoForbidden() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-mono text-5xl font-bold text-muted-foreground">403</p>
      <p className="mt-3 text-lg font-semibold">Not available in this state</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Alumni access unlocks once the college verifies your record. Until then
        only the dashboard and account pages are available.
      </p>
    </div>
  );
}

/** Guard a demo alumni page: renders the 403 view when not verified. */
export function RequireDemoVerified({
  children,
}: {
  children: React.ReactNode;
}) {
  const { persona } = useDemo();
  if (persona.verifyStatus !== "verified") return <DemoForbidden />;
  return <>{children}</>;
}
