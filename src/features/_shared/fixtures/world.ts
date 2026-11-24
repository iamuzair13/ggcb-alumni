/**
 * Demo world — the deterministic fixture universe used by /design/demo.
 * View-model types are defined per-feature; this file only shapes data.
 *
 * DEV/DEMO ONLY — never imported by production code paths.
 */
import { DEMO_MARKER, prng, pick, int, sample } from "./engine";
import type {
  Alumnus,
  AlumniChangeRequest,
  Department,
  Ecard,
} from "@/features/alumni-directory/types";
import type { AdminEvent } from "@/features/events/types";
import type { Announcement } from "@/features/announcements/types";
import type { Opportunity } from "@/features/opportunities/types";
import type { Story } from "@/features/stories/types";
import type { AuditEvent } from "@/features/audit-logs/types";
import type { ImportBatch } from "@/features/import-export/types";

export interface DemoWorld {
  departments: Department[];
  alumni: Alumnus[];
  changeRequests: AlumniChangeRequest[];
  ecards: Ecard[];
  events: AdminEvent[];
  announcements: Announcement[];
  opportunities: Opportunity[];
  stories: Story[];
  auditEvents: AuditEvent[];
  importBatches: ImportBatch[];
}

const DEPARTMENTS: Pick<Department, "name" | "code">[] = [
  { name: "Sample Computer Science", code: "SCS" },
  { name: "Sample English", code: "SENG" },
  { name: "Sample Mathematics", code: "SMTH" },
  { name: "Sample Physics", code: "SPHY" },
  { name: "Sample Economics", code: "SECO" },
  { name: "Sample Islamic Studies", code: "SISL" }, // kept empty — edge case
];

const GENDERS = ["male", "female"] as const;

function pad(n: number, w = 6): string {
  return String(n).padStart(w, "0");
}

export function generateWorld(): DemoWorld {
  const departments: Department[] = DEPARTMENTS.map((d, i) => ({
    id: `dep-${i + 1}`,
    name: d.name,
    code: d.code,
    isActive: i !== 5,
    alumniCount: 0,
  }));

  const r = prng(20261010);
  const alumni: Alumnus[] = [];
  const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

  for (let i = 0; i < 140; i++) {
    const dept = departments[int(r, 0, 4)]; // last dept stays empty
    const passYear = pick(r, years);
    const startYear = passYear - 4;
    const name = i === 7 ? sample.longPerson() : sample.person(r);
    const statusRoll = r();
    const verifyStatus =
      statusRoll < 0.68
        ? "verified"
        : statusRoll < 0.88
          ? "under_approval"
          : "rejected";
    alumni.push({
      id: `al-${i + 1}`,
      userId: `u-${i + 1}`,
      rollNumber: sample.roll(startYear, i + 1),
      fullName: name,
      email: sample.email(r, name),
      phone: r() < 0.15 ? null : sample.phone(r),
      gender: pick(r, GENDERS),
      departmentId: dept.id,
      departmentName: dept.name,
      degree: "BS",
      sessionStartYear: startYear,
      sessionEndYear: passYear,
      passingYear: passYear,
      city: sample.city(r),
      district: r() < 0.5 ? "Vehari" : pick(r, ["Lahore", "Multan", "Sahiwal"]),
      country: r() < 0.92 ? "Pakistan" : pick(r, ["UAE", "UK", "Saudi Arabia"]),
      employer: sample.employer(r),
      jobTitle: sample.jobTitle(r),
      sector: sample.sector(r),
      bio:
        r() < 0.3
          ? `Sample bio for ${name} — graduated ${passYear}, working in education.`
          : null,
      socialLinks:
        r() < 0.4 ? { linkedin: "https://example.invalid/in/sample" } : {},
      photoPath: r() < 0.6 ? `/photos/${i + 1}.jpg` : null,
      mentorAvailable: r() < 0.18,
      directoryVisible: r() < 0.85,
      showEmail: r() < 0.1,
      showPhone: r() < 0.05,
      verifyStatus,
      rejectReason:
        verifyStatus === "rejected"
          ? "Roll number not found in college records — please contact the college office."
          : null,
      isFeatured: false,
      achievement: null,
      datasource: r() < 0.3 ? "import" : "registration",
      createdAt: `2026-0${int(r, 1, 9)}-${pad(int(r, 1, 28), 2)}`,
    });
    dept.alumniCount += 1;
  }

  // Featured alumni — 6 verified picks with achievement text.
  const verified = alumni.filter((a) => a.verifyStatus === "verified");
  const achievements = [
    "Founded a rural literacy programme reaching 300 students.",
    "Gold medalist, national mathematics olympiad.",
    "Published researcher in applied physics.",
    "Established a free evening school in Burewala.",
    "Leading a public-health outreach team.",
    "Built open-source tools used by local schools.",
  ];
  for (let i = 0; i < 6; i++) {
    const a = verified[i * 9 + 2];
    a.isFeatured = true;
    a.achievement = achievements[i];
  }

  // E-cards: one per verified alumnus; revoke one for the edge case.
  const ecards: Ecard[] = verified.map((a, i) => ({
    alumniId: a.id,
    cardNo: `GGCB-EC-${pad(i + 1)}`,
    status: "active",
    verifyToken: `tok-${a.id}`,
    issuedAt: `2026-${pad(int(r, 1, 6), 2)}-${pad(int(r, 1, 28), 2)}`,
    revokedAt: null,
  }));
  ecards[0].status = "revoked";
  ecards[0].revokedAt = "2026-08-01";

  // 60 change requests on restricted fields.
  const CHANGE_FIELDS = ["full_name", "department", "passing_year", "session"];
  const changeRequests: AlumniChangeRequest[] = [];
  for (let i = 0; i < 60; i++) {
    const a = alumni[int(r, 0, alumni.length - 1)];
    const status = i < 18 ? "pending" : i < 40 ? "approved" : "rejected";
    const field = pick(r, CHANGE_FIELDS);
    changeRequests.push({
      id: `cr-${i + 1}`,
      alumniId: a.id,
      alumniName: a.fullName,
      rollNumber: a.rollNumber,
      changes: [
        {
          field,
          label:
            field === "full_name"
              ? "Full name"
              : field === "department"
                ? "Department"
                : field === "session"
                  ? "Session"
                  : "Passing year",
          oldValue:
            field === "passing_year"
              ? String(a.passingYear - 1)
              : field === "department"
                ? DEPARTMENTS[int(r, 0, 4)].name
                : field === "session"
                  ? `${a.sessionStartYear - 1}–${a.sessionEndYear - 1}`
                  : a.fullName.replace("Sample ", "Sample Old "),
          newValue:
            field === "passing_year"
              ? String(a.passingYear)
              : field === "department"
                ? a.departmentName
                : field === "session"
                  ? `${a.sessionStartYear}–${a.sessionEndYear}`
                  : a.fullName,
        },
      ],
      status,
      reviewNote:
        status === "rejected" ? "Does not match college records." : null,
      createdAt: `2026-${pad(int(r, 1, 10), 2)}-${pad(int(r, 1, 28), 2)}`,
      reviewedAt: status === "pending" ? null : "2026-10-30",
      reviewedBy: status === "pending" ? null : "Sample Staff A",
    });
  }

  // 12 events — 7 upcoming, 5 past, all four types.
  const EVENT_KINDS = ["reunion", "seminar", "talk", "other"] as const;
  const events: AdminEvent[] = Array.from({ length: 12 }, (_, i) => {
    const upcoming = i < 7;
    const month = upcoming ? int(r, 3, 12) : int(r, 1, 8);
    return {
      id: `ev-${i + 1}`,
      type: pick(r, EVENT_KINDS),
      title:
        pick(r, [
          "Annual alumni reunion",
          "Career seminar for final-year students",
          "Alumni talk: from GGCB to public service",
          "Blood donation camp",
          "Mentorship evening",
          "Department meetup",
          "Sports gala",
          "Scholarship information session",
        ]) + ` ${2026}`,
      description:
        "Sample event description — details are shared with registered alumni by email and on this page closer to the date.",
      startsAt: `202${upcoming ? 7 - 0 : 5}-${pad(month, 2)}-${pad(int(r, 1, 28), 2)}`,
      endsAt: null,
      venue: pick(r, [
        "Main Auditorium",
        "College Lawn",
        "Seminar Hall B",
        "Online",
      ]),
      imagePath: null,
      isPublished: r() < 0.85,
    };
  });

  // 6 announcements — 2 pinned, one with attachment, one expired.
  const announcements: Announcement[] = Array.from({ length: 6 }, (_, i) => ({
    id: `an-${i + 1}`,
    title: pick(r, [
      "Alumni directory verification week",
      "Annual dinner — save the date",
      "Library access for alumni resumes",
      "Call for mentor volunteers",
      "E-card issuance has begun",
      "College magazine: submit your piece",
    ]),
    body: "Sample announcement body — the college will post full details here. Watch this space for dates, venues and any documents you may need to bring.",
    attachmentPath: i === 2 ? "/files/sample-schedule.pdf" : null,
    publishAt: `2026-0${int(r, 2, 9)}-${pad(int(r, 1, 28), 2)}`,
    expiresAt: i === 5 ? "2026-01-15" : null,
    isPinned: i < 2,
    isPublished: i !== 4,
  }));

  // 15 opportunities — all four types, some expired.
  const OPP_TYPES = ["job", "internship", "scholarship", "other"] as const;
  const opportunities: Opportunity[] = Array.from({ length: 15 }, (_, i) => ({
    id: `op-${i + 1}`,
    type: OPP_TYPES[i % 4],
    title: pick(r, [
      "Teaching positions at a partner school",
      "Software engineering internship",
      "Merit scholarship for postgraduate study",
      "Junior accountant",
      "Research assistant (physics)",
      "Admin officer",
      "Lab attendant",
      "Content writer (alumni magazine)",
    ]),
    organization: pick(r, [
      "Sample District School",
      "Sample Textiles Ltd",
      "Sample Foundation",
      "Sample Software House",
      "Sample Bank",
    ]),
    description:
      "Sample opportunity description — eligibility, stipend/salary range and how to apply are listed on the apply page.",
    applyUrl: r() < 0.8 ? "https://example.invalid/apply" : null,
    contact: r() < 0.2 ? "jobs@example.invalid" : null,
    deadline:
      i % 5 === 0
        ? `2025-${pad(int(r, 1, 12), 2)}-${pad(int(r, 1, 28), 2)}` // expired
        : `2027-${pad(int(r, 1, 6), 2)}-${pad(int(r, 1, 28), 2)}`,
    isPublished: r() < 0.9,
  }));

  // 10 stories — approved/pending/rejected spread; first featured gallery set.
  const STORY_STATUS = [
    "approved",
    "approved",
    "approved",
    "approved",
    "approved",
    "approved",
    "pending",
    "pending",
    "rejected",
    "pending",
  ] as const;
  const stories: Story[] = Array.from({ length: 10 }, (_, i) => {
    const a = verified[i * 7];
    return {
      id: `st-${i + 1}`,
      alumniId: a.id,
      alumniName: a.fullName,
      title: pick(r, [
        "From a village classroom to a lecture hall",
        "Starting my own school after GGCB",
        "How the library changed my direction",
        "A first-generation graduate's path",
        "Building software for local government",
        "Teaching where I was once a student",
      ]),
      content:
        "Sample story — I joined GGCB unsure of what came next. The teachers here pushed me to aim higher. After graduating I found my first role through a senior alumnus, and I still try to pay that forward.\n\nIf you are reading this as a student: keep going. It compounds.",
      imagePath: null,
      status: STORY_STATUS[i],
      reviewNote:
        STORY_STATUS[i] === "rejected"
          ? "Please resubmit with the year and department named."
          : null,
      createdAt: `2026-0${int(r, 3, 9)}-${pad(int(r, 1, 28), 2)}`,
    };
  });

  // 40 audit events across typical admin actions.
  const AUDIT_ACTIONS = [
    "alumni.approved",
    "alumni.rejected",
    "alumni.featured",
    "department.created",
    "department.updated",
    "staff.invited",
    "staff.deactivated",
    "import.committed",
    "export.downloaded",
    "story.approved",
    "ecard.revoked",
    "announcement.published",
  ];
  const auditEvents: AuditEvent[] = Array.from({ length: 40 }, (_, i) => ({
    id: `audit-${i + 1}`,
    actor: pick(r, [
      "Sample Staff A",
      "Sample Staff B",
      "system",
      "Sample Staff C",
    ]),
    action: pick(r, AUDIT_ACTIONS),
    entity: pick(r, ["alumni", "department", "user", "content", "import"]),
    entityId: `al-${int(r, 1, 140)}`,
    createdAt: `2026-${pad(int(r, 1, 11), 2)}-${pad(int(r, 1, 28), 2)}T${pad(int(r, 8, 18), 2)}:${pad(int(r, 10, 59), 2)}:00`,
    metadata: { rows: int(r, 1, 40), note: `${DEMO_MARKER}` },
  }));

  // 12 import batches — mixed statuses.
  const BATCH_STATUS = [
    "committed",
    "committed",
    "committed",
    "committed",
    "committed",
    "committed",
    "failed",
    "validated",
    "committed",
    "draft",
    "committed",
    "dry_run",
  ] as const;
  const importBatches: ImportBatch[] = Array.from({ length: 12 }, (_, i) => {
    const total = int(r, 40, 400);
    const errors = BATCH_STATUS[i] === "failed" ? int(r, 3, 25) : int(r, 0, 8);
    return {
      id: `imp-${i + 1}`,
      fileName: `alumni-${2019 + (i % 7)}-batch-${(i % 3) + 1}.xlsx`,
      status: BATCH_STATUS[i],
      mappingUsed: "default-v1",
      totalRows: total,
      insertedRows:
        BATCH_STATUS[i] === "committed" || BATCH_STATUS[i] === "dry_run"
          ? total - errors
          : 0,
      errorRows: errors,
      createdAt: `2026-0${int(r, 2, 10)}-${pad(int(r, 1, 28), 2)}`,
      committedBy: BATCH_STATUS[i] === "committed" ? "Sample Staff A" : null,
    };
  });

  return {
    departments,
    alumni,
    changeRequests,
    ecards,
    events,
    announcements,
    opportunities,
    stories,
    auditEvents,
    importBatches,
  };
}

/** Singleton for demo pages — generate once per server render tree. */
export const world = generateWorld();
