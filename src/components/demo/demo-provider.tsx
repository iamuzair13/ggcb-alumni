"use client";

import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  DEMO_PERSONAS,
  type DemoPersona,
  type DemoPersonaId,
} from "@/features/_shared/personas";

interface DemoCtx {
  persona: DemoPersona;
  setPersona: (id: DemoPersonaId) => void;
  /** Simulate an async round-trip for optimistic-looking demo states. */
  simulate: <T>(value: T, ms?: number) => Promise<T>;
}

const Ctx = createContext<DemoCtx | null>(null);

/** `?persona=<id>` seeds the demo state — still client-only, still a demo. */
function PersonaSeed({ set }: { set: (id: DemoPersonaId) => void }) {
  const params = useSearchParams();
  const seed = params.get("persona") as DemoPersonaId | null;
  useEffect(() => {
    if (seed && DEMO_PERSONAS.some((p) => p.id === seed)) set(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<DemoPersonaId>("alumni-verified");
  const persona = DEMO_PERSONAS.find((p) => p.id === id) ?? DEMO_PERSONAS[0];
  return (
    <Ctx.Provider
      value={{
        persona,
        setPersona: setId,
        simulate: (value, ms = 450) =>
          new Promise((res) => setTimeout(() => res(value), ms)),
      }}
    >
      <Suspense fallback={null}>
        <PersonaSeed set={setId} />
      </Suspense>
      {children}
    </Ctx.Provider>
  );
}

export function useDemo(): DemoCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDemo must be used inside <DemoProvider>");
  return ctx;
}
