/**
 * Production-bundle leak check — fails if any fixture/demo marker string
 * appears in a client chunk that a REAL route serves. Run after
 * `pnpm build`.
 *
 * Method: walk `.next/server/app/**​/*.html` for emitted route shells,
 * skipping the dev-only `design/` subtree (those routes prerender to 404
 * in production). Collect the `<script src>` chunks every real route
 * references, then grep only those chunks for markers. Chunks emitted
 * for dev-only routes may legally contain fixture strings — those routes
 * never respond in production, so the strings are unreachable.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const MARKERS = [
  "ggcb-demo-fixture-e3f9a1", // DEMO_MARKER in _shared/fixtures/engine.ts
  "example.invalid",
  "Sample Staff A",
  "Sample alumni-2",
];

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const appDir = join(".next", "server", "app");
const staticDir = join(".next", "static");

/* 1 — collect chunk refs from every REAL route's emitted HTML. */
const chunkRe = /src="\/_next\/static\/chunks\/([^"]+\.js)"/g;
const realChunks = new Map<string, string>(); // chunk file → first route
let htmlCount = 0;
try {
  for (const file of walk(appDir)) {
    if (!file.endsWith(".html")) continue;
    const rel = relative(appDir, file).replaceAll("\\", "/");
    if (rel === "_global-error.html" || rel.startsWith("design/")) continue;
    htmlCount += 1;
    const html = readFileSync(file, "utf8");
    for (const m of html.matchAll(chunkRe)) {
      if (!realChunks.has(m[1])) realChunks.set(m[1], rel);
    }
  }
} catch {
  console.error(`Cannot read ${appDir} — run 'pnpm build' first.`);
  process.exit(2);
}
if (htmlCount === 0) {
  console.error(
    `No route HTML found under ${appDir} — run 'pnpm build' first.`,
  );
  process.exit(2);
}

/* 2 — grep only those chunks for markers. */
const hits: { file: string; marker: string; route: string }[] = [];
let scanned = 0;
for (const [chunk, route] of realChunks) {
  const path = join(staticDir, "chunks", chunk);
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    continue; // chunk may be a shared runtime ref not on disk here
  }
  scanned += 1;
  for (const marker of MARKERS) {
    if (text.includes(marker)) hits.push({ file: chunk, marker, route });
  }
}

if (hits.length > 0) {
  console.error(
    "FAIL — demo/fixture strings in chunks served to REAL production routes:",
  );
  for (const h of hits)
    console.error(`  ${h.file}: "${h.marker}"  (referenced by ${h.route})`);
  process.exit(1);
}
console.log(
  `OK — ${scanned} client chunks across ${htmlCount} real routes are marker-free. ` +
    `(Dev-only demo chunks exist in the bundle but their routes 404 in production.)`,
);
