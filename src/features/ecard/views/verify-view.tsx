"use client";

/**
 * Public E-card verification — the future /verify/[token] (blueprint §3.1).
 * Shows the minimum needed to confirm a card: name, department, passing
 * year, card status. Never anything else — no email, phone, or roll number.
 * A small selector cycles the three states for review.
 */
import { useState } from "react";
import { CircleAlert, ShieldCheck, ShieldX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { cn } from "@/lib/utils";
import type { EcardVerifyResult } from "../types";

type VerifyState = "valid" | "revoked" | "notfound";

const STATES: { id: VerifyState; label: string }[] = [
  { id: "valid", label: "Valid" },
  { id: "revoked", label: "Revoked" },
  { id: "notfound", label: "Not found" },
];

export function VerifyView({ result }: { result: EcardVerifyResult }) {
  const [state, setState] = useState<VerifyState>("valid");

  return (
    <div className="space-y-5">
      {/* Demo-only state selector */}
      <div
        role="group"
        aria-label="Demo: choose the verification result"
        className="flex flex-wrap gap-2 rounded-lg border border-dashed p-3"
      >
        {STATES.map((s) => (
          <Button
            key={s.id}
            size="sm"
            variant={state === s.id ? "default" : "outline"}
            aria-pressed={state === s.id}
            onClick={() => setState(s.id)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {state === "notfound" ? (
        <InlineAlert variant="destructive" title="Link not valid">
          This verification link is not valid. It may be mistyped, expired, or
          the card was never issued.
        </InlineAlert>
      ) : (
        <>
          <div className="flex items-start gap-3">
            {state === "valid" ? (
              <ShieldCheck
                className="mt-0.5 size-7 shrink-0 text-success"
                aria-hidden="true"
              />
            ) : (
              <ShieldX
                className="mt-0.5 size-7 shrink-0 text-destructive"
                aria-hidden="true"
              />
            )}
            <div className="min-w-0">
              <p className="font-heading text-lg leading-tight font-semibold">
                {result.name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.department} · Class of {result.passingYear}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {state === "valid" ? (
              <>
                <Badge className="bg-success text-success-foreground">
                  <ShieldCheck className="size-3" aria-hidden="true" />
                  Verified GGCB alumnus
                </Badge>
                <Badge variant="outline">Card active</Badge>
              </>
            ) : (
              <Badge className="bg-destructive/10 text-destructive">
                <CircleAlert className="size-3" aria-hidden="true" />
                Card revoked
              </Badge>
            )}
          </div>

          {state === "revoked" ? (
            <InlineAlert variant="warning">
              This card was revoked — the record may have been replaced or
              withdrawn. Ask the holder to contact the college alumni office.
            </InlineAlert>
          ) : (
            <p
              className={cn(
                "rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs",
                "text-muted-foreground",
              )}
            >
              This page confirms card status only. For privacy it shows no
              contact details or record numbers.
            </p>
          )}
        </>
      )}
    </div>
  );
}
