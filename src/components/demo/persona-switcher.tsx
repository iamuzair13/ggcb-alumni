"use client";

import { UserRound } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useDemo } from "./demo-provider";
import { DEMO_PERSONAS, type DemoPersonaId } from "@/features/_shared/personas";

/**
 * Persona switcher — pure client demo state. Never touches sessions,
 * cookies, or authorization; it only changes which fixture slice and
 * which nav the demo renders.
 */
export function PersonaSwitcher() {
  const { persona, setPersona } = useDemo();
  return (
    <div className="flex items-center gap-2">
      <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
      <Select<DemoPersonaId>
        value={persona.id}
        onValueChange={(v) => setPersona(v as DemoPersonaId)}
      >
        <SelectTrigger
          size="sm"
          className="min-w-48"
          aria-label="Viewing as persona"
        >
          {/* Computed label — closed Select.Value can't resolve item text. */}
          <span className="flex-1 truncate text-left">{persona.label}</span>
        </SelectTrigger>
        <SelectContent>
          {DEMO_PERSONAS.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
