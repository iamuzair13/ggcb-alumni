import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Stepper } from "@/components/shared/stepper";
import { DropZone } from "@/components/shared/drop-zone";
import { BarChartH, ChartCard } from "@/components/shared/charts";
import { DeadlineBadge } from "@/components/shared/deadline-badge";
import { DiffTable } from "@/components/shared/diff-table";
import { CompletenessMeter } from "@/components/shared/completeness-meter";
import { CalendarGrid } from "@/components/shared/calendar-grid";
import { VerifyView } from "@/features/ecard/views/verify-view";
import { AnnouncementsView } from "@/features/announcements/views/announcements-view";
import { OpportunitiesView } from "@/features/opportunities/views/opportunities-view";
import type { Announcement } from "@/features/announcements/types";
import type { Opportunity } from "@/features/opportunities/types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/design/demo",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("Stepper", () => {
  it("marks the current step and completes earlier ones", () => {
    render(
      <Stepper steps={["Upload", "Map", "Validate", "Commit"]} current={1} />,
    );
    const current = screen.getByText("Map").closest("span")!.parentElement!;
    expect(within(current).getByText("Map")).toBeInTheDocument();
    expect(screen.getByText("Map").closest("[aria-current]")).toHaveAttribute(
      "aria-current",
      "step",
    );
    // Step 1 is done → check icon instead of the number.
    const list = screen.getByRole("list", { name: "Progress" });
    expect(list.querySelectorAll("svg").length).toBe(1);
  });
});

describe("DropZone", () => {
  function pickFile(name: string): File {
    return new File(["x".repeat(10)], name, { type: "text/csv" });
  }

  it("accepts a file with a supported extension", () => {
    const onFile = vi.fn();
    render(
      <DropZone
        onFile={onFile}
        accept=".csv,.xlsx"
        maxBytes={5 * 1048576}
        hint="CSV or Excel"
      />,
    );
    const input = document.querySelector("input[type=file]")!;
    fireEvent.change(input, { target: { files: [pickFile("alumni.csv")] } });
    expect(onFile).toHaveBeenCalledWith(
      expect.objectContaining({ name: "alumni.csv" }),
    );
  });

  it("rejects a wrong extension with a message", () => {
    const onFile = vi.fn();
    render(
      <DropZone
        onFile={onFile}
        accept=".csv,.xlsx"
        maxBytes={5 * 1048576}
        hint="CSV or Excel"
      />,
    );
    const input = document.querySelector("input[type=file]")!;
    fireEvent.change(input, { target: { files: [pickFile("notes.txt")] } });
    expect(onFile).toHaveBeenCalledWith(
      null,
      expect.stringContaining("not a supported type"),
    );
  });

  it("rejects an oversized file with the limit in the message", () => {
    const onFile = vi.fn();
    render(
      <DropZone onFile={onFile} accept=".csv" maxBytes={1024} hint="CSV" />,
    );
    const input = document.querySelector("input[type=file]")!;
    const big = new File(["x".repeat(2048)], "big.csv");
    fireEvent.change(input, { target: { files: [big] } });
    expect(onFile).toHaveBeenCalledWith(
      null,
      expect.stringContaining("the limit is 0 MB"),
    );
  });

  it("drop path validates the same way", () => {
    const onFile = vi.fn();
    const { container } = render(
      <DropZone onFile={onFile} accept=".csv" maxBytes={1048576} hint="CSV" />,
    );
    const zone = container.firstElementChild!;
    fireEvent.drop(zone, {
      dataTransfer: { files: [pickFile("drop.csv")] },
    });
    expect(onFile).toHaveBeenCalledWith(
      expect.objectContaining({ name: "drop.csv" }),
    );
  });
});

describe("ChartCard", () => {
  it("toggles between chart and data table", async () => {
    const user = userEvent.setup();
    render(
      <ChartCard
        title="By department"
        summary="Three rows."
        rows={[
          ["Dept A", 42],
          ["Dept B", 27],
        ]}
      >
        <BarChartH
          data={[
            { label: "Dept A", value: 42 },
            { label: "Dept B", value: 27 },
          ]}
        />
      </ChartCard>,
    );
    const toggle = screen.getByRole("button", { name: "View as table" });
    await user.click(toggle);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Dept A")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View as chart" }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("DeadlineBadge", () => {
  it("renders Closed for a past deadline", () => {
    render(<DeadlineBadge deadline="2020-01-01" />);
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("renders days-left text for a future deadline", () => {
    const future = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    render(<DeadlineBadge deadline={future} />);
    expect(screen.getByText(/d left/)).toBeInTheDocument();
  });
});

describe("DiffTable", () => {
  it("lists old → new values per field", () => {
    render(
      <DiffTable
        changes={[
          {
            field: "name",
            label: "Full name",
            oldValue: "Old Name",
            newValue: "New Name",
          },
          {
            field: "year",
            label: "Passing year",
            oldValue: "2023",
            newValue: "2024",
          },
        ]}
      />,
    );
    expect(screen.getByText("Old Name")).toBeInTheDocument();
    expect(screen.getByText("New Name")).toBeInTheDocument();
    expect(screen.getByText("2023")).toBeInTheDocument();
  });
});

describe("CompletenessMeter", () => {
  it("shows the percent and missing items", () => {
    render(
      <CompletenessMeter percent={62} missing={["a photo", "your employer"]} />,
    );
    expect(screen.getByText(/62%/)).toBeInTheDocument();
    expect(screen.getByText(/a photo/)).toBeInTheDocument();
  });
});

describe("CalendarGrid", () => {
  it("shows events on their day and calls onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const today = new Date().toISOString().slice(0, 10);
    render(
      <CalendarGrid
        events={[{ id: "e1", date: today, title: "Reunion day" }]}
        onSelect={onSelect}
      />,
    );
    const eventBtn = screen.getByText("Reunion day");
    await user.click(eventBtn);
    expect(onSelect).toHaveBeenCalled();
  });
});

const ANN: Announcement[] = [
  {
    id: "a1",
    title: "Regular notice",
    body: "Body one",
    attachmentPath: null,
    publishAt: "2025-01-10",
    expiresAt: null,
    isPinned: false,
    isPublished: true,
  },
  {
    id: "a2",
    title: "Pinned notice",
    body: "Body two",
    attachmentPath: "docs/agm-2025.pdf",
    publishAt: "2025-01-05",
    expiresAt: null,
    isPinned: true,
    isPublished: true,
  },
];

describe("AnnouncementsView", () => {
  it("renders pinned items first and expands on click", async () => {
    const user = userEvent.setup();
    render(<AnnouncementsView announcements={ANN} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("Pinned notice");
    expect(buttons[0]).toHaveAttribute("aria-expanded", "false");
    await user.click(buttons[0]);
    expect(buttons[0]).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Body two")).toBeInTheDocument();
    expect(screen.getByText("agm-2025.pdf")).toBeInTheDocument();
  });

  it("filters out expired announcements", () => {
    render(
      <AnnouncementsView
        announcements={[{ ...ANN[0], expiresAt: "2001-01-01" }]}
      />,
    );
    expect(screen.getByText("No announcements yet")).toBeInTheDocument();
  });
});

const futureDeadline = () =>
  new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10);

const OPPS: Opportunity[] = [
  {
    id: "o1",
    type: "job",
    title: "Lecturer — Physics",
    organization: "Govt Higher Education",
    description: "Teaching post in physics.",
    applyUrl: "https://example.com/apply",
    contact: null,
    deadline: futureDeadline(),
    isPublished: true,
  },
  {
    id: "o2",
    type: "scholarship",
    title: "MPhil Scholarship",
    organization: "HEC",
    description: "Merit scholarship.",
    applyUrl: null,
    contact: "scholarships@example.com",
    deadline: "2001-01-01",
    isPublished: true,
  },
];

describe("OpportunitiesView", () => {
  it("filters by type chip and by search text", async () => {
    const user = userEvent.setup();
    render(<OpportunitiesView opportunities={OPPS} />);

    await user.click(screen.getByRole("button", { name: "Scholarships" }));
    expect(screen.getByText("MPhil Scholarship")).toBeInTheDocument();
    expect(screen.queryByText("Lecturer — Physics")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All" }));
    await user.type(screen.getByLabelText("Search opportunities"), "physics");
    expect(screen.getByText("Lecturer — Physics")).toBeInTheDocument();
    expect(screen.queryByText("MPhil Scholarship")).not.toBeInTheDocument();
  });

  it("expired items are Closed with a disabled apply", () => {
    render(<OpportunitiesView opportunities={OPPS} />);
    const card = screen.getByText("MPhil Scholarship").closest("li")!;
    expect(within(card).getAllByText("Closed").length).toBeGreaterThan(0);
    expect(within(card).getByText("Applications closed")).toBeInTheDocument();
    const apply = within(card).getByRole("button", { name: "Apply" });
    expect(apply).toBeDisabled();
  });

  it("shows an empty state with a clear action when nothing matches", async () => {
    const user = userEvent.setup();
    render(<OpportunitiesView opportunities={OPPS} />);
    await user.type(
      screen.getByLabelText("Search opportunities"),
      "zzz-no-match",
    );
    expect(
      screen.getByText("No opportunities match these filters"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Lecturer — Physics")).toBeInTheDocument();
  });
});

describe("VerifyView", () => {
  const result = {
    ok: true,
    name: "Sample Alumnus",
    department: "Computer Science",
    passingYear: 2021,
    status: "active" as const,
  };

  it("switches between valid, revoked and not-found states", async () => {
    const user = userEvent.setup();
    render(<VerifyView result={result} />);

    expect(screen.getByText("Verified GGCB alumnus")).toBeInTheDocument();
    expect(screen.getByText("Sample Alumnus")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Revoked" }));
    expect(screen.getByText("Card revoked")).toBeInTheDocument();
    expect(screen.getByText(/ask the holder to contact/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Not found" }));
    expect(
      screen.getByText(/verification link is not valid/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Sample Alumnus")).not.toBeInTheDocument();
  });

  it("never leaks contact details in any state", async () => {
    const user = userEvent.setup();
    render(
      <VerifyView result={{ ...result, name: "Hidden Contact Person" }} />,
    );
    for (const label of ["Valid", "Revoked", "Not found"]) {
      await user.click(screen.getByRole("button", { name: label }));
      expect(screen.queryByText(/@/)).not.toBeInTheDocument();
    }
  });
});
