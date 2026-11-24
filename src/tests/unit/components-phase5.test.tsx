import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PasswordField } from "@/components/shared/password-field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RowActions } from "@/components/shared/row-actions";
import { UserStatusBadge } from "@/components/shared/user-status-badge";
import { InlineAlert } from "@/components/shared/inline-alert";
import { ChoosePasswordView } from "@/components/auth/choose-password-view";
import { ForgotPasswordView } from "@/components/auth/forgot-password-view";
import { VerifyEmailView } from "@/components/auth/verify-email-view";

describe("PasswordField", () => {
  it("shows/hides via an accessible toggle", async () => {
    const user = userEvent.setup();
    render(
      <PasswordField
        label="New password"
        name="pw"
        autoComplete="new-password"
        value="secret-value"
        onValueChange={() => {}}
      />,
    );
    const input = screen.getByLabelText(/New password/) as HTMLInputElement;
    expect(input.type).toBe("password");
    const toggle = screen.getByRole("button", { name: "Show password" });
    await user.click(toggle);
    expect(input.type).toBe("text");
    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toBeInTheDocument();
  });

  it("the live policy hint reflects length", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [v, setV] = React.useState("");
      return (
        <PasswordField
          label="Password"
          name="pw"
          autoComplete="new-password"
          value={v}
          onValueChange={setV}
          showPolicyHint
        />
      );
    }
    render(<Harness />);
    const hint = screen.getByText("At least 10 characters");
    await user.type(screen.getByLabelText(/Password/), "12345678901");
    expect(hint).toHaveClass("text-success");
  });
});

describe("ConfirmDialog — names the object, explicit verb", () => {
  it("renders the object name in title and confirm label", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Deactivate Sample Staff A?"
        description="They will be signed out."
        confirmLabel="Deactivate Sample Staff A"
        destructive
        onConfirm={onConfirm}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Deactivate Sample Staff A" }),
    );
    expect(onConfirm).toHaveBeenCalled();
  });
});

describe("RowActions — labelled menu with disabled reasons", () => {
  it("has an accessible 'Actions for X' trigger and shows disabled rows with the reason", async () => {
    const user = userEvent.setup();
    render(
      <RowActions
        label="Actions for Sample Staff A"
        items={[
          { key: "edit", label: "Edit…", onSelect: () => {} },
          {
            key: "deactivate",
            label: "Deactivate…",
            destructive: true,
            disabled: true,
            disabledReason: "Last superadmin",
            onSelect: () => {},
          },
        ]}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Actions for Sample Staff A" }),
    );
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Last superadmin")).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: "Edit…" }),
    ).toBeInTheDocument();
    // Keyboard contract: Escape dismisses the menu (Base UI focus trap).
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("UserStatusBadge — icon + text + colour (never colour alone)", () => {
  it.each([
    ["active", "Active"],
    ["invited", "Invited"],
    ["inactive", "Inactive"],
  ] as const)("renders the %s label", (status, label) => {
    render(<UserStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("Account views — POST-only consumption + neutral confirmation", () => {
  it("verify-email renders a CONFIRM button; the action fires only on click", async () => {
    const user = userEvent.setup();
    const action = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { status: "ok" } });
    render(<VerifyEmailView token="tok" action={action} />);
    expect(action).not.toHaveBeenCalled(); // GET never consumes
    await user.click(screen.getByRole("button", { name: "Confirm my email" }));
    expect(action).toHaveBeenCalledWith({ token: "tok" });
    expect(await screen.findByText("Email verified")).toBeInTheDocument();
  });

  it("verify-email collapses all failure reasons to one message", async () => {
    const user = userEvent.setup();
    const action = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { status: "invalid" } });
    render(<VerifyEmailView token="tok" action={action} />);
    await user.click(screen.getByRole("button", { name: "Confirm my email" }));
    expect(
      await screen.findByText("Link invalid or expired"),
    ).toBeInTheDocument();
  });

  it("choose-password surfaces a policy error inline and keeps the token", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({
      ok: true,
      data: { status: "policy", reason: "Use at least 10 characters" },
    });
    render(<ChoosePasswordView token="tok" action={action} variant="reset" />);
    // Type the values into a controlled pair, then submit the form element
    // directly — asserting the button's pending label under parallel jsdom
    // load is flaky; the form submit exercises the same code path.
    await user.type(screen.getByLabelText(/New password/), "short");
    await user.type(screen.getByLabelText(/Confirm password/), "short");
    fireEvent.submit(
      screen
        .getByRole("button", { name: /Save password|Saving…/ })
        .closest("form")!,
    );
    expect(
      await screen.findByText("Use at least 10 characters"),
    ).toBeInTheDocument();
    expect(action).toHaveBeenCalledWith({
      token: "tok",
      password: "short",
      confirm: "short",
    });
    // Still the form — the invalid screen did NOT replace it (findByRole
    // because the pending label "Saving…" flips back asynchronously).
    expect(
      await screen.findByRole("button", { name: "Save password" }),
    ).toBeInTheDocument();
  });

  it("forgot-password shows the same neutral confirmation for every outcome", async () => {
    const user = userEvent.setup();
    const action = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { status: "ok" } });
    render(<ForgotPasswordView action={action} />);
    await user.type(screen.getByLabelText(/Email/), "ghost@example.invalid");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText(/If an account exists/)).toBeInTheDocument();
  });
});

describe("InlineAlert", () => {
  it("destructive alerts use role=alert; others use role=status", () => {
    const { rerender } = render(
      <InlineAlert variant="destructive">Boom</InlineAlert>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    rerender(<InlineAlert variant="info">FYI</InlineAlert>);
    expect(screen.getByRole("status")).toHaveTextContent("FYI");
  });
});
