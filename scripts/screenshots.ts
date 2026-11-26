/**
 * Screenshot helper � captures the fixture previews (and key pages) at the
 * blueprint widths (360/768/1280) into design-review/<slice>/.
 * Usage: BASE=http://localhost:3100 pnpm tsx scripts/screenshots.ts
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.env.BASE ?? "http://localhost:3100";
const slice = process.env.SLICE ?? "phase-05";
const widths = [360, 768, 1280] as const;

const routes = [
  "/design/screens/account",
  "/design/screens/users",
  "/design/screens/departments",
  "/forgot-password",
  "/verify-email?token=x",
  "/reset-password?token=x",
  "/login",
];

async function main() {
  const dir = join("design-review", slice);
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({
    args: ["--disable-gpu", "--disable-software-rasterizer"],
  });
  for (const width of widths) {
    for (const route of routes) {
      // Fresh page per route � a stale page intermittently broke CDP
      // screenshot capture on this machine.
      const page = await browser.newPage({ viewport: { width, height: 1200 } });
      const name = route.replace(/[/?=&]/g, "-").replace(/^-+|-+$/g, "");
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
          break;
        } catch (e) {
          if (attempt === 1) throw e;
          await page.waitForTimeout(1000);
        }
      }
      await page.waitForTimeout(1500);
      try {
        await page.screenshot({
          path: join(dir, `${name}@${width}.png`),
          fullPage: false,
        });
        console.log(`captured ${route} @ ${width}px`);
      } catch (e) {
        console.log(
          `FAILED ${route} @ ${width}px: ${(e as Error).message.split("\n")[0]}`,
        );
      }
      await page.close();
    }
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
