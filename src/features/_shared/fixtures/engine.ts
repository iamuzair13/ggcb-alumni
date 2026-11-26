/**
 * Deterministic fixture engine — dev/demo data only, NEVER imported by
 * production code paths. A tiny seeded PRNG (mulberry32) plus keyed
 * helpers so the same world is generated on every run (no Math.random).
 *
 * The marker string below lets CI prove no fixture text leaks into
 * production client chunks (see scripts/check-demo-leak.ts).
 */
export const DEMO_MARKER = "ggcb-demo-fixture-e3f9a1";

/** mulberry32 — tiny, deterministic, good enough for fixture spread. */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(r: () => number, xs: readonly T[]): T {
  return xs[Math.floor(r() * xs.length)];
}

export function int(r: () => number, min: number, max: number): number {
  return min + Math.floor(r() * (max - min + 1));
}

/** Sample-based helpers — deterministic per call-site index. */
export const sample = {
  /** Realistic-looking but clearly synthetic display name. */
  person(r: () => number): string {
    const first = [
      "Ayesha",
      "Bilal",
      "Danish",
      "Fatima",
      "Hamza",
      "Iqra",
      "Junaid",
      "Khadija",
      "Mahnoor",
      "Naveed",
      "Rabia",
      "Sana",
      "Talha",
      "Uzma",
      "Waqar",
      "Yusra",
      "Zeeshan",
      "Hira",
      "Adeel",
      "Sadia",
    ];
    const last = [
      "Abbasi",
      "Chaudhry",
      "Ghuman",
      "Gujjar",
      "Hashmi",
      "Joyia",
      "Kamboh",
      "Lodhi",
      "Mahar",
      "Nagra",
      "Paracha",
      "Qureshi",
      "Sial",
      "Tarar",
      "Warraich",
    ];
    return `Sample ${pick(r, first)} ${pick(r, last)}`;
  },
  /** Deliberately long edge-case name (80 chars). */
  longPerson(): string {
    return `Sample ${"Muhammad Abdullah Kareem ".repeat(3)}Chaudhry`.slice(
      0,
      80,
    );
  },
  email(r: () => number, slug: string): string {
    const local = slug
      .toLowerCase()
      .replace(/[^a-z]+/g, ".")
      .replace(/^\.|\.$/g, "");
    const domain = pick(r, ["example.invalid", "sample.invalid"]);
    return `${local || "sample.user"}@${domain}`;
  },
  phone(r: () => number): string {
    return `+92 30${int(r, 0, 9)} ${int(r, 1000000, 9999999)}`;
  },
  roll(year: number, seq: number): string {
    return `GG-${year}-${String(seq).padStart(4, "0")}`;
  },
  city(r: () => number): string {
    return pick(r, [
      "Burewala",
      "Vehari",
      "Lahore",
      "Multan",
      "Arifwala",
      "Sahiwal",
      "Faisalabad",
      "Bahawalnagar",
    ]);
  },
  employer(r: () => number): string | null {
    if (r() < 0.22) return null; // missing employer edge case
    return pick(r, [
      "Sample District School",
      "Sample Textiles Ltd",
      "Sample Bank",
      "Sample Hospital",
      "Sample Software House",
      "Govt Sample College",
      "Sample Agri Dept",
      "Sample NGO",
    ]);
  },
  jobTitle(r: () => number): string | null {
    if (r() < 0.25) return null;
    return pick(r, [
      "Teacher",
      "Accountant",
      "Nurse",
      "Software Engineer",
      "Field Officer",
      "Lecturer",
      "Admin Officer",
      "Researcher",
    ]);
  },
  sector(r: () => number): string | null {
    if (r() < 0.2) return null;
    return pick(r, [
      "Education",
      "Health",
      "IT",
      "Banking",
      "Textiles",
      "Public sector",
      "Agriculture",
      "Non-profit",
    ]);
  },
};
