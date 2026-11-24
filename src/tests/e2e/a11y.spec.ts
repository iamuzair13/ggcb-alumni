import { expect, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

const pages = [
  "/design",
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email?token=x",
  "/reset-password?token=x",
  "/design/screens/account",
  "/design/screens/users",
  "/design/screens/departments",
  "/dashboard",
  "/admin",
];

for (const path of pages) {
  test(`axe scan: ${path} has no serious/critical violations`, async ({
    page,
  }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(
      blocking,
      blocking
        .map(
          (v) =>
            `${v.id} (${v.impact}): ${v.help} — ${v.nodes
              .map((n) => n.target.join(" "))
              .join(", ")}`,
        )
        .join("\n"),
    ).toHaveLength(0);
  });
}
