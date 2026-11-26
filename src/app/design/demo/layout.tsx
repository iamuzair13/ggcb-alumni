import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoProvider } from "@/components/demo/demo-provider";
import { DemoBanner } from "@/components/demo/demo-banner";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Prototype — GGCB Alumni Portal",
};

/**
 * Clickable prototype — DEV ONLY. Hard 404 in any production build;
 * fixture modules are server-side only so no demo string can reach a
 * production client chunk (verified by scripts/check-demo-leak.ts).
 */
export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return (
    <DemoProvider>
      <DemoBanner />
      {children}
    </DemoProvider>
  );
}
