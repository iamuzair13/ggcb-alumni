import Link from "next/link";
import { COLLEGE } from "@/lib/college";

/** Public footer — contact placeholders flagged for D1/D11. */
export function SiteFooter() {
  return (
    <footer className="border-t bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-semibold">{COLLEGE.fullName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The official alumni portal — register, keep your record current,
            carry your E-card.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Alumni office
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {COLLEGE.contact.email}
            <br />
            {COLLEGE.contact.phone}
          </p>
        </div>
        <div className="sm:text-right">
          <Link
            href="/privacy"
            className="text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Privacy notice
          </Link>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Portal built for GGCB alumni.
          </p>
        </div>
      </div>
    </footer>
  );
}
