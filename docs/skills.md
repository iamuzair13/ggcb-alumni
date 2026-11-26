# Agent skills — what was used and why

Recorded per phase-1 requirement: every skill invoked or installed is
listed with its justification. Nothing else was installed.

## Used (read / invoked)

| Skill           | Source                    | Why it was needed                                                                                                                                                                                                                 |
| --------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui-ux-pro-max` | local (`~/.devin/skills`) | Mandatory before UI work. Generated the "Accessible & Ethical" direction, palette candidates, typography recommendation (accessibility-first typeface), UX guidelines and stack notes that seeded `docs/design/design-system.md`. |
| `find-skills`   | local (Windsurf)          | To locate the UI/design/a11y skills below — the required "design skill" and "web-design-guidelines" were not installed yet.                                                                                                       |

## Installed (global, `~/.agents/skills/`)

| Skill                   | Source                          | Why it was installed                                                                                                                                  |
| ----------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend-design`       | `anthropics/skills`             | The required general design skill: typography, layout, spacing, and "build real interfaces not mockups" guidance applied to the shells and `/design`. |
| `web-design-guidelines` | `vercel-labs/agent-skills`      | Explicitly required by the phase spec — used for the final UI review (output: `docs/design/guidelines-review.md`).                                    |
| `accessibility`         | `addyosmani/web-quality-skills` | WCAG 2.1 AA is a hard requirement; used to sanity-check focus, labelling, contrast, and reduced-motion choices.                                       |

## Evaluated but not installed

- **Next.js App Router / Playwright skills** — appeared in search results;
  not installed because the bundled `next/dist/docs` guides and the
  Playwright docs already cover what this phase needed. Installing would
  have violated "install only justified skills".

## What they changed (traceability)

- Palette: UI/UX search suggested Atkinson Hyperlegible + a calm
  institutional direction → implemented as Public Sans + Source Serif 4 +
  IBM Plex Mono on an evergreen/cream palette (see design-system.md §3–4
  for the choice rationale and measured contrast ratios).
- Guidelines review: `web-design-guidelines` produced
  `docs/design/guidelines-review.md`; its checks (focus states,
  `transition-all` ban, `text-foreground/60` contrast, skeleton-wrapping,
  `useId`, no horizontal scroll) are now covered by code or tests.
- Accessibility: hidden-input/label issues on Base UI choice controls and
  hover-only link underlines were caught by the axe e2e suite informed by
  the accessibility skill's checklist.
