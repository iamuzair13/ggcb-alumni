import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AlumniDirectoryView } from "@/components/admin/alumni-directory-view";
import type {
  DirectoryFilterOptions,
  DirectoryRow,
  DirectoryTabCounts,
} from "@/server/services/alumni-directory";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin/alumni",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const ROW: DirectoryRow = {
  id: "a1",
  fullName: "Ayesha Khan",
  rollNumber: "GG-2019-0001",
  departmentName: "Computer Science",
  passingYear: 2023,
  city: "Burewala",
  verifyStatus: "verified",
  datasource: "registration",
  isFeatured: true,
  createdAt: "2026-10-15T09:00:00.000Z",
};

const COUNTS: DirectoryTabCounts = {
  verified: 104,
  underApproval: 17,
  rejected: 7,
  pendingChangeRequests: 4,
};

const OPTIONS: DirectoryFilterOptions = {
  departments: [{ id: "00000000-0000-0000-0000-000000000011", name: "CS" }],
  passingYears: [2023],
  cities: ["Burewala"],
  districts: [],
  sectors: [],
};

const EMPTY: DirectoryTabCounts = {
  verified: 0,
  underApproval: 0,
  rejected: 0,
  pendingChangeRequests: 0,
};

describe("AlumniDirectoryView (real /admin register surface)", () => {
  it("renders tab counts, the row and sort links for a populated tab", () => {
    render(
      <AlumniDirectoryView
        pathname="/admin"
        tab="verified"
        counts={COUNTS}
        params={{}}
        options={OPTIONS}
        rows={[ROW]}
        requests={[]}
        total={104}
        page={1}
        pageSize={15}
        sort="name"
        narrowed={false}
      />,
    );
    expect(screen.getAllByText("Ayesha Khan")[0]).toBeInTheDocument();
    expect(screen.getAllByText("GG-2019-0001")[0]).toBeInTheDocument();
    // Tab counts ride in the link strip.
    expect(screen.getByText("104")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /under approval/i }),
    ).toHaveAttribute("href", "/admin?tab=under_approval");
    // Sortable header writes the URL.
    expect(
      screen.getAllByRole("link", { name: /sort by name/i })[0],
    ).toHaveAttribute("aria-current", "true");
    // Read-only: no decision affordances.
    expect(
      screen.queryByRole("button", { name: /approve/i }),
    ).not.toBeInTheDocument();
  });

  it("points an empty register at the import flow", () => {
    render(
      <AlumniDirectoryView
        pathname="/admin"
        tab="verified"
        counts={EMPTY}
        params={{}}
        options={OPTIONS}
        rows={[]}
        requests={[]}
        total={0}
        page={1}
        pageSize={15}
        sort="name"
        narrowed={false}
      />,
    );
    expect(screen.getByText(/the register is empty/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /import the alumni list/i }),
    ).toHaveAttribute("href", "/admin/import-export");
  });

  it("renders the change-request queue with pending-first rows", () => {
    render(
      <AlumniDirectoryView
        pathname="/admin"
        tab="requests"
        counts={COUNTS}
        params={{ tab: "requests" }}
        options={OPTIONS}
        rows={[]}
        requests={[
          {
            id: "cr-1",
            alumniId: "a1",
            alumniName: "Ayesha Khan",
            rollNumber: "GG-2019-0001",
            fields: ["Passing year"],
            status: "pending",
            reviewNote: null,
            createdAt: "2026-11-20T09:00:00.000Z",
            reviewedAt: null,
          },
        ]}
        total={1}
        page={1}
        pageSize={15}
        sort="name"
        narrowed={false}
      />,
    );
    expect(screen.getAllByText("Ayesha Khan")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Passing year")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Pending")[0]).toBeInTheDocument();
  });
});
