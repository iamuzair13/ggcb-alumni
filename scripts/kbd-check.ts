import { chromium } from "@playwright/test";

(async () => {
  const b = await chromium.launch({ args: ["--disable-gpu"] });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto("http://localhost:3100/design", {
    waitUntil: "domcontentloaded",
  });
  await p.waitForSelector("text=RowActions", { timeout: 20000 });
  const trigger = p.getByRole("button", { name: "Actions for Sample Staff A" });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await p.waitForSelector("[role=menuitem]", { timeout: 4000 });
  const items = await p.evaluate(() =>
    Array.from(document.querySelectorAll("[role=menuitem]")).map(
      (e) =>
        `${(e.textContent || "").trim()}${e.getAttribute("aria-disabled") ? " [disabled]" : ""}`,
    ),
  );
  console.log("menu items:", JSON.stringify(items));
  await p.getByRole("menuitem", { name: /Deactivate/ }).click();
  await p.waitForSelector("[role=dialog],[role=alertdialog]", {
    timeout: 4000,
  });
  const inDialog = await p.evaluate(() => {
    const d = document.querySelector("[role=dialog],[role=alertdialog]");
    const f = document.activeElement;
    return {
      dialogRole: d?.getAttribute("role"),
      title: d?.querySelector("h2,h3")?.textContent,
      focusInside: d ? d.contains(f) : false,
      focused: f ? `${f.tagName} ${(f.textContent || "").slice(0, 50)}` : null,
    };
  });
  console.log("confirm dialog:", JSON.stringify(inDialog));
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);
  const closed = await p.evaluate(
    () => !document.querySelector("[role=dialog],[role=alertdialog]"),
  );
  console.log("escape closes dialog:", closed);
  await b.close();
})();
