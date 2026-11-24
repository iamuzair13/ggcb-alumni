import { describe, expect, it } from "vitest";
import { generateWorld } from "@/features/_shared/fixtures/world";
import { DEMO_MARKER } from "@/features/_shared/fixtures/engine";

describe("fixture world — deterministic + complete", () => {
  it("produces identical worlds on every run (no Math.random)", () => {
    const a = generateWorld();
    const b = generateWorld();
    expect(b).toEqual(a);
  });

  it("covers the required entity counts", () => {
    const w = generateWorld();
    expect(w.alumni.length).toBe(140);
    expect(w.departments.length).toBe(6);
    expect(w.events.length).toBe(12);
    expect(w.announcements.length).toBe(6);
    expect(w.opportunities.length).toBe(15);
    expect(w.stories.length).toBe(10);
    expect(w.auditEvents.length).toBe(40);
    expect(w.importBatches.length).toBe(12);
    expect(w.changeRequests.length).toBe(60);
  });

  it("spreads statuses and years realistically", () => {
    const w = generateWorld();
    const byStatus = (s: string) =>
      w.alumni.filter((a) => a.verifyStatus === s).length;
    expect(byStatus("verified")).toBeGreaterThan(60);
    expect(byStatus("under_approval")).toBeGreaterThan(10);
    expect(byStatus("rejected")).toBeGreaterThan(5);
    const years = new Set(w.alumni.map((a) => a.passingYear));
    expect(years.size).toBeGreaterThanOrEqual(5);
    // featured flags + a revoked e-card + an empty department
    expect(w.alumni.filter((a) => a.isFeatured).length).toBe(6);
    expect(w.ecards.some((c) => c.status === "revoked")).toBe(true);
    expect(w.departments.some((d) => d.alumniCount === 0)).toBe(true);
  });

  it("keeps the edge cases", () => {
    const w = generateWorld();
    // 80-char name
    expect(w.alumni.some((a) => a.fullName.length === 80)).toBe(true);
    // missing employers / photos / phones exist
    expect(w.alumni.some((a) => a.employer === null)).toBe(true);
    expect(w.alumni.some((a) => a.photoPath === null)).toBe(true);
    // expired opportunity + rejected registration with a reason
    expect(
      w.opportunities.some(
        (o) => new Date(o.deadline) < new Date("2026-01-01"),
      ),
    ).toBe(true);
    expect(
      w.alumni.some(
        (a) => a.verifyStatus === "rejected" && a.rejectReason?.length,
      ),
    ).toBe(true);
    // synthetic-only data
    expect(w.alumni.every((a) => a.email.endsWith(".invalid"))).toBe(true);
    expect(w.alumni.every((a) => a.fullName.startsWith("Sample "))).toBe(true);
  });

  it("carries the leak-detection marker server-side only", () => {
    expect(DEMO_MARKER).toBe("ggcb-demo-fixture-e3f9a1");
    const w = generateWorld();
    expect(w.auditEvents.some((e) => e.metadata.note === DEMO_MARKER)).toBe(
      true,
    );
  });
});
