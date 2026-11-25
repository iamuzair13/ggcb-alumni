/** Temp: 100 test alumni (GG-T-* rolls) + TEST-* departments + a few
 *  change requests. Cleanup: DELETE alumni_change_requests USING alumni
 *  WHERE roll_number LIKE 'GG-T-%'; DELETE FROM alumni WHERE roll_number
 *  LIKE 'GG-T-%'; DELETE FROM departments WHERE code LIKE 'TEST-%'. */
import { loadEnvFiles, requireEnv } from "./lib/env";
import { createDbClient } from "../src/server/db/connection";

const FIRST = [
  "Ahmed",
  "Bilal",
  "Usman",
  "Hassan",
  "Ali",
  "Farhan",
  "Imran",
  "Kashif",
  "Naveed",
  "Shahid",
  "Ayesha",
  "Fatima",
  "Zainab",
  "Maryam",
  "Sana",
  "Hina",
  "Rabia",
  "Sadia",
  "Nimra",
  "Iqra",
  "Waleed",
  "Tariq",
  "Adeel",
  "Faisal",
  "Junaid",
  "Owais",
  "Saqib",
  "Arslan",
  "Babar",
  "Danish",
];
const LAST = [
  "Khan",
  "Ahmed",
  "Ali",
  "Hussain",
  "Raza",
  "Malik",
  "Shah",
  "Akhtar",
  "Anwar",
  "Bhatti",
  "Chaudhry",
  "Gill",
  "Iqbal",
  "Javed",
  "Lodhi",
  "Mirza",
  "Nawaz",
  "Parvez",
  "Qureshi",
  "Randhawa",
];
const CITIES = [
  "Burewala",
  "Vehari",
  "Multan",
  "Lahore",
  "Faisalabad",
  "Islamabad",
  "Karachi",
  "Rawalpindi",
];
const DISTRICTS = [
  "Vehari",
  "Multan",
  "Lahore",
  "Faisalabad",
  "Islamabad",
  "Karachi",
];
const SECTORS = [
  "Education",
  "Government",
  "Private",
  "Health",
  "IT",
  "Banking",
  "NGO",
  "Agriculture",
];
const GENDERS = ["male", "female", "other"] as const;
const REASONS = [
  "Duplicate registration — earlier record already on file.",
  "Roll number could not be matched to the college register.",
  "Submitted name does not match the enrollment record.",
];
const DEPARTMENTS = [
  ["Computer Science", "TEST-CS"],
  ["Mathematics", "TEST-MATH"],
  ["English", "TEST-ENG"],
  ["Physics", "TEST-PHY"],
  ["Economics", "TEST-ECO"],
  ["Urdu", "TEST-URD"],
] as const;

const pick = <T>(arr: readonly T[], i: number) => arr[i % arr.length]!;

async function main() {
  loadEnvFiles();
  const sql = createDbClient(requireEnv("DATABASE_URL"), { max: 2 });

  if (process.argv.includes("--cleanup")) {
    // ggcb_app has no DELETE grant (least privilege) — cleanup needs
    // the admin role on DIRECT_URL, not the runtime role.
    await sql.end();
    const admin = createDbClient(requireEnv("DIRECT_URL"), { max: 1 });
    const cr = await admin`
      DELETE FROM alumni_change_requests r
      USING alumni a WHERE a.id = r.alumni_id AND a.roll_number LIKE 'GG-T-%'
      RETURNING r.id`;
    const a =
      await admin`DELETE FROM alumni WHERE roll_number LIKE 'GG-T-%' RETURNING id`;
    const d =
      await admin`DELETE FROM departments WHERE code LIKE 'TEST-%' RETURNING id`;
    console.log(
      `cleanup: ${cr.length} requests, ${a.length} alumni, ${d.length} departments`,
    );
    await admin.end();
    return;
  }

  const depts = await sql`
    INSERT INTO departments (name, code)
    SELECT name, code FROM (VALUES ${sql(DEPARTMENTS.map(([n, c]) => [n, c]))}) AS t(name, code)
    ON CONFLICT DO NOTHING
    RETURNING id, code
  `;
  // On re-runs departments may already exist — fetch all TEST-* ids.
  const allDepts =
    await sql`SELECT id, code FROM departments WHERE code LIKE 'TEST-%' ORDER BY code`;
  console.log(
    `departments ready: ${depts.length} inserted, ${allDepts.length} total`,
  );

  const rows = Array.from({ length: 100 }, (_, i) => {
    const n = i + 1;
    const status =
      n <= 70 ? "verified" : n <= 90 ? "under_approval" : "rejected";
    const year = 2010 + (i % 16); // 2010–2025
    const gender = i % 10 === 9 ? null : pick(GENDERS, i);
    const city = i % 9 === 8 ? null : pick(CITIES, i);
    const created = new Date(
      Date.now() - (i % 24) * 7 * 24 * 60 * 60 * 1000 - i * 3600 * 1000,
    );
    return {
      roll: `GG-T-${String(n).padStart(4, "0")}`,
      name: `${pick(FIRST, i)} ${pick(LAST, (i * 7) % LAST.length)}`,
      email: `seed${String(n).padStart(3, "0")}@example.test`,
      phone:
        i % 3 === 0
          ? `+92 30${i % 10} ${String(1000 + i).slice(0, 4)} ${String(200 + i).padStart(3, "0")}`
          : null,
      gender,
      dept: pick(allDepts, i).id,
      sStart: year - 4,
      sEnd: year,
      year,
      city,
      district: city ? pick(DISTRICTS, i) : null,
      country: "Pakistan",
      sector: i % 6 === 5 ? null : pick(SECTORS, i),
      employer: i % 4 === 0 ? pick(SECTORS, i + 2) : null,
      featured: i % 17 === 0, // ~6 featured
      mentor: i % 8 === 0,
      dirVisible: i % 3 !== 0,
      status,
      reason: status === "rejected" ? pick(REASONS, i) : null,
      verifiedAt: status === "verified" ? created.toISOString() : null,
      source: i % 4 === 0 ? "registration" : "import",
      created: created.toISOString(),
    };
  });

  let inserted = 0;
  for (const r of rows) {
    await sql`
      INSERT INTO alumni (
        roll_number, full_name, email, phone, gender, department_id,
        session_start_year, session_end_year, passing_year,
        city, district, country, employer, sector,
        is_featured, mentor_available, directory_visible,
        verify_status, reject_reason, verified_at, datasource, created_at
      ) VALUES (
        ${r.roll}, ${r.name}, ${r.email}, ${r.phone}, ${r.gender}, ${r.dept},
        ${r.sStart}, ${r.sEnd}, ${r.year},
        ${r.city}, ${r.district}, ${r.country}, ${r.employer}, ${r.sector},
        ${r.featured}, ${r.mentor}, ${r.dirVisible},
        ${r.status}, ${r.reason}, ${r.verifiedAt}, ${r.source}, ${r.created}
      )`;
    inserted++;
  }
  console.log(`alumni inserted: ${inserted}`);

  // 6 change requests on verified rows: 3 pending / 2 approved / 1 rejected.
  const verified = await sql`
    SELECT id FROM alumni WHERE roll_number LIKE 'GG-T-%'
      AND verify_status = 'verified' ORDER BY roll_number LIMIT 6`;
  const crSpec = [
    { status: "pending", reviewedAt: null },
    { status: "pending", reviewedAt: null },
    { status: "pending", reviewedAt: null },
    { status: "approved", reviewedAt: new Date().toISOString() },
    { status: "approved", reviewedAt: new Date().toISOString() },
    { status: "rejected", reviewedAt: new Date().toISOString() },
  ];
  for (let i = 0; i < verified.length; i++) {
    const s = crSpec[i]!;
    await sql`
      INSERT INTO alumni_change_requests (alumni_id, changes, status, reviewed_at, review_note)
      VALUES (${verified[i]!.id},
              ${sql.json({ city: { old: "Burewala", new: pick(CITIES, i) } })},
              ${s.status}, ${s.reviewedAt},
              ${s.status === "rejected" ? "Insufficient documentation" : null})`;
  }
  console.log(`change requests inserted: ${verified.length}`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
