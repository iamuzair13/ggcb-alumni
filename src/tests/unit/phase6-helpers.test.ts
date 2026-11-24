import { describe, expect, it } from "vitest";
import { autoMapColumns } from "@/features/import-export/auto-map";
import { axisTicks, thinLabels } from "@/components/shared/charts";
import { monthGrid } from "@/components/shared/calendar-grid";
import {
  applyFilters,
  createDirectoryAdapter,
  sortAlumni,
} from "@/features/alumni-directory/fixtures/adapter";
import { generateWorld } from "@/features/_shared/fixtures/world";

const world = generateWorld();

describe("import column auto-mapping", () => {
  it("maps common Excel header spellings to target fields", () => {
    const map = autoMapColumns([
      "Roll No",
      "Student Name",
      "Dept",
      "Pass Year",
      "Email",
      "Extra Col",
    ]);
    const byHeader = Object.fromEntries(
      map.map((m) => [m.sourceHeader, m.targetField]),
    );
    expect(byHeader["Roll No"]).toBe("rollNumber");
    expect(byHeader["Student Name"]).toBe("fullName");
    expect(byHeader["Dept"]).toBe("department");
    expect(byHeader["Pass Year"]).toBe("passingYear");
    expect(byHeader["Email"]).toBe("email");
    expect(byHeader["Extra Col"]).toBeNull(); // unrecognised → ignored
  });

  it("flags required targets and never double-claims a field", () => {
    const map = autoMapColumns(["Roll Number", "Roll No", "Name"]);
    const claimed = map.filter((m) => m.targetField === "rollNumber");
    expect(claimed).toHaveLength(1); // first match wins; second ignored
    expect(claimed[0].required).toBe(true);
  });
});

describe("chart math", () => {
  it("axisTicks returns nice round values covering the max", () => {
    expect(axisTicks(0)).toEqual([0]);
    const ticks = axisTicks(37);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(37);
    expect(ticks.every((t) => t % 5 === 0)).toBe(true);
  });

  it("thinLabels keeps every nth label for dense axes", () => {
    const dense = Array.from({ length: 20 }, (_, i) => `L${i}`);
    const shown = thinLabels(dense, 7);
    expect(shown.filter(Boolean).length).toBeLessThanOrEqual(7);
    expect(shown[0]).toBe(true);
    const sparse = thinLabels(["a", "b", "c"], 7);
    expect(sparse.every(Boolean)).toBe(true);
  });
});

describe("calendar math", () => {
  it("monthGrid yields a complete Monday-first grid", () => {
    const days = monthGrid(2026, 0); // January 2026
    expect(days).toHaveLength(42);
    expect(days[0].date.getDay()).toBe(1); // grid starts Monday
    const inMonth = days.filter((d) => d.inMonth);
    expect(inMonth).toHaveLength(31);
  });

  it("handles months starting on a Monday with no lead days", () => {
    // June 2026 starts on a Monday
    const days = monthGrid(2026, 5);
    expect(days[0].date.getDate()).toBe(1);
    expect(days[0].inMonth).toBe(true);
  });
});

describe("directory fixture adapter", () => {
  it("filters by status, department, featured and text search", () => {
    const verified = applyFilters(world.alumni, {
      verifyStatus: "verified",
    });
    expect(verified.every((a) => a.verifyStatus === "verified")).toBe(true);
    const featured = applyFilters(world.alumni, { featured: true });
    expect(featured).toHaveLength(6);
    const dept = applyFilters(world.alumni, {
      departmentId: world.departments[0].id,
    });
    expect(dept.every((a) => a.departmentId === world.departments[0].id)).toBe(
      true,
    );
    const searched = applyFilters(world.alumni, { q: "sample" });
    expect(searched.length).toBe(world.alumni.length);
    expect(applyFilters(world.alumni, { q: "zzzz-no-match" })).toHaveLength(0);
  });

  it("sorts by the supported keys", () => {
    const byYear = sortAlumni(world.alumni, "year:asc");
    for (let i = 1; i < byYear.length; i++) {
      expect(byYear[i].passingYear).toBeGreaterThanOrEqual(
        byYear[i - 1].passingYear,
      );
    }
    const byName = sortAlumni(world.alumni, "name:asc");
    expect(byName[0].fullName <= byName[byName.length - 1].fullName).toBe(true);
  });

  it("decide/feature mutate the adapter state with tab counts in sync", () => {
    const adapter = createDirectoryAdapter(
      world.alumni,
      world.changeRequests,
      world.departments,
    );
    const pending = adapter
      .listAlumni({ verifyStatus: "under_approval" })
      .items.slice(0, 3)
      .map((a) => a.id);
    adapter.decide(pending, "approve");
    const counts = adapter.tabCounts();
    expect(adapter.listAlumni({ verifyStatus: "under_approval" }).total).toBe(
      counts.under_approval,
    );
    adapter.feature(pending, true);
    expect(adapter.listAlumni({ featured: true }).total).toBe(
      6 + pending.length,
    );
    const req = adapter.listChangeRequests("pending")[0];
    adapter.decideChangeRequest(req.id, "reject", "Does not match records.");
    expect(
      adapter.listChangeRequests("rejected").some((r) => r.id === req.id),
    ).toBe(true);
  });
});
