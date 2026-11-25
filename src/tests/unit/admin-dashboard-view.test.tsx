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

describe("AdminDashboardView (real /admin surface)", () => {
  it("renders KPIs, queue rows and real route links when populated", () => {
    render(<AdminDashboardView data={POPULATED} />);
    expect(screen.getByText("Ayesha Khan")).toBeInTheDocument();
    expect(screen.getByText("Hassan Raza")).toBeInTheDocument();
    expect(
      screen.getAllByText("Featured alumni").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("link", { name: /open directory/i }),
    ).toHaveAttribute("href", "/admin/alumni?tab=under_approval");
    // Read-only: no approve/reject affordances on the dashboard itself.
    expect(
      screen.queryByRole("button", { name: /approve/i }),
    ).not.toBeInTheDocument();
  });

  it("points an empty register at the import flow", () => {
    render(<AdminDashboardView data={EMPTY} />);
    expect(screen.getByText(/queue is clear/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /import the alumni list/i }),
    ).toHaveAttribute("href", "/admin/import-export");
  });
});
