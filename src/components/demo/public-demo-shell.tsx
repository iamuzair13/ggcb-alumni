/**
 * PublicDemoShell — chrome-free centred layout for the demo's public
 * screens (register, check-email, card verification). Public pages have
 * no alumni/admin chrome; the only navigation is a link back to the
 * prototype index.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { DEMO_BASE } from "./demo-shells";

export function PublicDemoShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col px-4 py-10 sm:py-14">
      <Link
        href={DEMO_BASE}
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Prototype index
      </Link>
      <div className="mt-8 mb-6">
        <Logo />
      </div>
      <Card className="p-6 sm:p-8">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
        <div className="mt-6">{children}</div>
      </Card>
    </main>
  );
}
