/**
 * Design-review capture: screenshots every real + demo route at 360/768/1280
 * and asserts no page-level horizontal scroll at 360px.
 *
 * Usage: `pnpm dev` in another terminal, then
 *   node scripts/design-screenshots.mjs [baseUrl]
 * Output: design-review/phase-06/<route>-<width>.png (git-ignored).
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = "design-review/phase-06";
const WIDTHS = [360, 768, 1280];

/** [name, path] — persona via ?persona= for staff screens. */
const ROUTES = [
  ["landing", "/"],
  ["privacy", "/privacy"],
  ["demo-index", "/design/demo"],
  ["pub-register", "/design/demo/public/register?persona=anonymous"],
  ["pub-check-email", "/design/demo/public/check-email?persona=anonymous"],
  ["pub-verify", "/design/demo/public/verify?persona=anonymous"],
  [
    "alumni-dashboard-verified",
    "/design/demo/alumni/dashboard?persona=alumni-verified",
  ],
  [
    "alumni-dashboard-pending",
    "/design/demo/alumni/dashboard?persona=alumni-pending",
  ],
  [
    "alumni-dashboard-rejected",
    "/design/demo/alumni/dashboard?persona=alumni-rejected",
  ],
  ["alumni-profile", "/design/demo/alumni/profile?persona=alumni-verified"],
  ["alumni-requests", "/design/demo/alumni/requests?persona=alumni-verified"],
  ["alumni-ecard", "/design/demo/alumni/e-card?persona=alumni-verified"],
  ["alumni-events", "/design/demo/alumni/events?persona=alumni-verified"],
  [
    "alumni-announcements",
    "/design/demo/alumni/announcements?persona=alumni-verified",
  ],
  [
    "alumni-opportunities",
    "/design/demo/alumni/opportunities?persona=alumni-verified",
  ],
  ["alumni-stories", "/design/demo/alumni/stories?persona=alumni-verified"],
  ["alumni-account", "/design/demo/alumni/account?persona=alumni-verified"],
  ["admin-dashboard", "/design/demo/admin?persona=admin"],
  ["admin-dashboard-viewer", "/design/demo/admin?persona=viewer"],
  ["admin-alumni", "/design/demo/admin/alumni?persona=admin"],
  [
    "admin-alumni-requests-tab",
    "/design/demo/admin/alumni?tab=requests&persona=admin",
  ],
  ["admin-alumni-detail", "/design/demo/admin/alumni/al-8?persona=admin"],
  ["admin-departments", "/design/demo/admin/departments?persona=admin"],
  ["admin-content", "/design/demo/admin/content?persona=admin"],
  ["admin-import-export", "/design/demo/admin/import-export?persona=admin"],
  ["admin-analytics", "/design/demo/admin/analytics?persona=admin"],
  ["admin-audit-logs", "/design/demo/admin/audit-logs?persona=admin"],
  ["admin-users", "/design/demo/admin/users?persona=superadmin"],
  ["admin-users-as-admin-forbidden", "/design/demo/admin/users?persona=admin"],
];

const browser = await chromium.launch();
mkdirSync(OUT, { recursive: true });
const scrollViolations = [];

for (const [name, path] of ROUTES) {
  for (const w of WIDTHS) {
    const page = await browser.newPage({
      viewport: { width: w, height: 900 },
      reducedMotion: "reduce",
    });
    const res = await page.goto(`${BASE}${path}`, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    if (!res || res.status() !== 200) {
      console.log(`FAIL ${name} @${w}: HTTP ${res?.status()}`);
    }
    await page.waitForTimeout(400); // let demo shells settle
    await page.screenshot({
      path: join(OUT, `${name}-${w}.png`),
      fullPage: false,
    });
    if (w === 360) {
      const over = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      if (over > 0) scrollViolations.push(`${name}: +${over}px`);
    }
    await page.close();
  }
  process.stdout.write(`ok ${name}\n`);
}

await browser.close();

if (scrollViolations.length) {
  console.log("\nHORIZONTAL SCROLL VIOLATIONS @360px:");
  scrollViolations.forEach((v) => console.log(`  ${v}`));
} else {
  console.log("\nNo page-level horizontal scroll at 360px on any route.");
}
writeFileSync(
  join(OUT, "scroll-check.txt"),
  scrollViolations.join("\n") || "clean",
);
