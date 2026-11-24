"use client";

/**
 * Alumni E-card page — the artifact at full size plus its actions.
 * Downloads are server work so they show the wired-later toast; Print is
 * real (globals.css .print-ecard isolates the card). A demo selector swaps
 * the three card states for review.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EcardArtifact } from "@/components/shared/ecard-artifact";
import { formatDate } from "@/lib/utils/format";
import type { EcardView } from "../types";

type DemoStatus = "active" | "revoked" | "unissued";

const STATES: { id: DemoStatus; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "revoked", label: "Revoked" },
  { id: "unissued", label: "Not yet issued" },
];

export function AlumniEcardView({ data }: { data: EcardView }) {
  const [status, setStatus] = useState<DemoStatus>(
    data.card ? data.card.status : "unissued",
  );
  const { alumnus } = data;

  const cardNo =
    status === "unissued"
      ? "Pending issue"
      : (data.card?.cardNo ?? "GGCB-EC-000000");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Your E-card</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Show it at college events and anywhere that asks for proof of alumni
          status.
        </p>
      </div>

      {/* Demo-only state selector */}
      <div
        role="group"
        aria-label="Demo: choose the card state"
        className="flex flex-wrap gap-2 rounded-lg border border-dashed p-3"
      >
        {STATES.map((s) => (
          <Button
            key={s.id}
            size="sm"
            variant={status === s.id ? "default" : "outline"}
            aria-pressed={status === s.id}
            onClick={() => setStatus(s.id)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {/* .print-ecard is the print CSS hook — only this subtree prints. */}
      <div className="print-ecard">
        <EcardArtifact
          name={alumnus.fullName}
          department={alumnus.departmentName}
          session={`${alumnus.sessionStartYear}–${alumnus.sessionEndYear}`}
          cardNo={cardNo}
          rollNumber={alumnus.rollNumber}
          status={status}
          photoAlt={
            alumnus.photoPath
              ? `Photograph of ${alumnus.fullName}`
              : "Photograph placeholder"
          }
        />
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {status === "unissued"
          ? "Your E-card is being prepared — it appears here when issued."
          : status === "revoked"
            ? `${data.card ? `Issued ${formatDate(data.card.issuedAt)} · ` : ""}Revoked${
                data.card?.revokedAt
                  ? ` ${formatDate(data.card.revokedAt)}`
                  : ""
              } — contact the college if this looks wrong.`
            : `${
                data.card ? `Issued ${formatDate(data.card.issuedAt)} · ` : ""
              }Status: Active`}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => toast("This will be wired in a later slice.")}
        >
          <Download data-icon="inline-start" aria-hidden="true" />
          Download PNG
        </Button>
        <Button
          variant="outline"
          onClick={() => toast("This will be wired in a later slice.")}
        >
          <FileText data-icon="inline-start" aria-hidden="true" />
          Download PDF
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer data-icon="inline-start" aria-hidden="true" />
          Print
        </Button>
      </div>
    </div>
  );
}
