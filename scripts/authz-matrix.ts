/**
 * authz:matrix — regenerate docs/security/authz-matrix.md from the route
 * policy. The unit snapshot test fails when the committed file drifts.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderMatrixMarkdown } from "../src/server/auth/matrix";

const out = join(process.cwd(), "docs", "security", "authz-matrix.md");
writeFileSync(out, renderMatrixMarkdown());
console.log(`[authz:matrix] wrote ${out}`);
