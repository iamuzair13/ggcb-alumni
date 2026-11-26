import { cn } from "@/lib/utils";
import { Logo } from "./logo";

/**
 * The E-card artifact — the product's signature object (ui-direction §1).
 * A die-cut-feeling card: header band with the crest placeholder, name +
 * department as the record lines, mono card number on a baseline rule,
 * dashed photo frame and a visibly-not-scannable QR placeholder.
 */
export function EcardArtifact({
  name,
  department,
  session,
  cardNo,
  rollNumber,
  status = "active",
  photoAlt,
  className,
  compact = false,
}: {
  name: string;
  department: string;
  session: string;
  cardNo: string;
  rollNumber?: string;
  status?: "active" | "revoked" | "unissued";
  photoAlt?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <figure
      aria-label={`Alumni E-card for ${name}`}
      className={cn(
        "relative overflow-hidden rounded-xl border-2 border-primary/25 bg-card shadow-sm",
        "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-primary before:content-['']",
        className,
      )}
    >
      {/* Die-cut notches */}
      <span
        className="absolute top-1/2 -left-2.5 size-5 -translate-y-1/2 rounded-full border-2 border-primary/25 bg-background"
        aria-hidden="true"
      />
      <span
        className="absolute top-1/2 -right-2.5 size-5 -translate-y-1/2 rounded-full border-2 border-primary/25 bg-background"
        aria-hidden="true"
      />

      <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-2.5 pl-5">
        <div className="flex items-center gap-2">
          <Logo compact />
          <span className="text-[11px] font-semibold tracking-wide text-primary">
            ALUMNI E-CARD
          </span>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            status === "active" && "bg-success text-success-foreground",
            status === "revoked" && "bg-destructive/10 text-destructive",
            status === "unissued" && "bg-muted text-muted-foreground",
          )}
        >
          {status === "active"
            ? "Active"
            : status === "revoked"
              ? "Revoked"
              : "Not issued"}
        </span>
      </div>

      <figcaption className="flex gap-4 px-4 py-4 pl-5">
        {/* Photo placeholder */}
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md border-2 border-dashed border-input bg-muted/40 text-center",
            compact ? "h-16 w-12" : "h-24 w-[4.5rem]",
          )}
          role="img"
          aria-label={photoAlt ?? "Photograph placeholder"}
        >
          <span className="px-1 text-[9px] leading-tight text-muted-foreground">
            Photo
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-base leading-tight font-semibold">
            {name}
          </p>
          <dl className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-muted-foreground">
            <div className="flex gap-1.5">
              <dt className="shrink-0">Dept</dt>
              <dd className="truncate">{department}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="shrink-0">Session</dt>
              <dd>{session}</dd>
            </div>
            {rollNumber && (
              <div className="flex gap-1.5">
                <dt className="shrink-0">Roll no</dt>
                <dd className="font-mono">{rollNumber}</dd>
              </div>
            )}
          </dl>
          <div className="mt-2 border-t border-dashed border-border pt-1.5">
            <p className="font-mono text-xs font-medium tracking-wider">
              {cardNo}
            </p>
          </div>
        </div>

        {/* QR placeholder — visibly not scannable (crossed grid) */}
        <div
          className="hidden shrink-0 flex-col items-center gap-1 sm:flex"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 48 48"
            className={cn(
              "size-16 text-muted-foreground/50",
              compact && "size-12",
            )}
          >
            <rect
              x="1"
              y="1"
              width="46"
              height="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="6"
              y="6"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="30"
              y="6"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="6"
              y="30"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M24 24 L44 44 M44 24 L24 44"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <rect x="22" y="22" width="4" height="4" fill="currentColor" />
            <rect x="30" y="30" width="4" height="4" fill="currentColor" />
          </svg>
          <span className="text-[8px] tracking-wide text-muted-foreground">
            QR PLACEHOLDER
          </span>
        </div>
      </figcaption>
    </figure>
  );
}
