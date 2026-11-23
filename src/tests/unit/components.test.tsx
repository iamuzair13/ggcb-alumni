import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

describe("Button", () => {
  it("renders its label and is clickable", async () => {
    const user = userEvent.setup();
    let clicked = 0;
    render(<Button onClick={() => (clicked += 1)}>Save changes</Button>);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(clicked).toBe(1);
  });

  it("shows a spinner and blocks interaction while loading", () => {
    render(<Button loading>Save changes</Button>);
    const button = screen.getByRole("button", { name: "Save changes" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("applies variant and size classes", () => {
    render(
      <Button variant="outline" size="sm">
        Edit
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Edit" })).toHaveClass(
      "border-border",
    );
  });
});

describe("FormField + Input", () => {
  it("associates label, hint and input", () => {
    render(
      <FormField label="Email" required hint="We never share it.">
        {(id, describedBy) => <Input id={id} aria-describedby={describedBy} />}
      </FormField>,
    );
    const input = screen.getByLabelText(/Email/);
    expect(input).toBeInTheDocument();
    expect(screen.getByText("We never share it.")).toBeInTheDocument();
    expect(input).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining("hint"),
    );
  });

  it("shows error text with an alert role", () => {
    render(
      <FormField label="Roll number" error="Already registered.">
        {(id, describedBy) => (
          <Input id={id} aria-invalid aria-describedby={describedBy} />
        )}
      </FormField>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Already registered.");
  });
});

describe("Dialog", () => {
  it("opens on trigger and exposes title/description to AT", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger render={<Button />}>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Approve?</DialogTitle>
          <DialogDescription>This issues an E-card.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Approve?" }),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent("This issues an E-card.");
  });
});

describe("DataTable", () => {
  type Row = { id: number; name: string; year: number };
  const columns: DataTableColumn<Row>[] = [
    { key: "name", header: "Name", cell: (r) => r.name },
    { key: "year", header: "Year", cell: (r) => r.year },
  ];

  it("renders rows in both table and stacked-card layouts", () => {
    render(
      <DataTable
        columns={columns}
        rows={[{ id: 1, name: "Sample", year: 2024 }]}
      />,
    );
    // Desktop table
    expect(
      screen.getByRole("columnheader", { name: "Name" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Sample" })).toBeInTheDocument();
    // Mobile card list mirrors the data
    expect(screen.getAllByText("Sample").length).toBeGreaterThanOrEqual(2);
  });

  it("renders the empty state when there are no rows", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        empty={<p>No records found.</p>}
      />,
    );
    expect(screen.getByText("No records found.")).toBeInTheDocument();
  });
});
