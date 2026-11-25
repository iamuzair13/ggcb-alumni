import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminDashboardView } from "@/components/admin/dashboard-view";
import type { AdminDashboardData } from "@/features/admin-dashboard/types";

const POPULATED: AdminDashboardData = {
  kpis: {
    totalAlumni: 128,
    verified: 104,
    underApproval: 17,
    rejected: 7,
    featured: 6,
    ecardsIssued: 0,
    pendingChangeRequests: 4,
  },
  pendingQueue: [
    {
      id: "a1",
      fullName: "Ayesha Khan",
      rollNumber: "GG-2019-0001",
      departmentName: "Computer Science",
      passingYear: 2023,
      verifyStatus: "under_approval",
      datasource: "registration",
    },
  ],
  recentRegistrations: [
    {
      id: "a2",
      fullName: "Hassan Raza",
      rollNumber: "GG-2021-0099",
      departmentName: "Physics",
      passingYear: 2025,
      verifyStatus: "verified",
      datasource: "import",
    },
  ],
  trend: [{ month: "Nov 2026", count: 15 }],
};

const EMPTY: AdminDashboardData = {
  ...POPULATED,
  kpis: {
    totalAlumni: 0,
    verified: 0,
    underApproval: 0,
    rejected: 0,
    featured: 0,
    ecardsIssued: 0,
    pendingChangeRequests: 0,
  },
  pendingQueue: [],
  recentRegistrations: [],
};

const REGISTER = <div data-testid="register-slot">register</div>;

describe("AdminDashboardView (merged /admin surface)", () => {
  it("renders KPI links, the register slot and context cards", () => {
    render(<AdminDashboardView data={POPULATED} register={REGISTER} />);
    // Every KPI is a filter into the register below.
    expect(
      screen.getByRole("link", { name: /under approval/i }),
    ).toHaveAttribute("href", "/admin?tab=under_approval");
    expect(
      screen.getByRole("link", { name: /pending change requests/i }),
    ).toHaveAttribute("href", "/admin?tab=requests");
    expect(
      screen.getAllByRole("link", { name: /featured alumni/i })[0],
    ).toHaveAttribute("href", "/admin?featured=1");
    // The directory mount point.
    expect(screen.getByTestId("register-slot")).toBeInTheDocument();
    // Glance cards still render.
    expect(screen.getByText("Hassan Raza")).toBeInTheDocument();
    // Read-only: no approve/reject affordances on the dashboard itself.
    expect(
      screen.queryByRole("button", { name: /approve/i }),
    ).not.toBeInTheDocument();
  });

  it("points an empty register at the import flow", () => {
    render(<AdminDashboardView data={EMPTY} register={REGISTER} />);
    expect(
      screen.getByRole("link", { name: /import the alumni list/i }),
    ).toHaveAttribute("href", "/admin/import-export");
  });
});
