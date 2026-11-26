/**
 * Fixture adapter for the alumni directory — implements the port over a
 * world slice passed in as a plain object. Client-safe: no fixture data
 * lives here, only filtering/mutation logic; the data arrives as props.
 */
import type { AlumniDirectoryPort, Paged } from "../ports";
import type {
  Alumnus,
  AlumniChangeRequest,
  AlumniFilters,
  Department,
} from "../types";

const PAGE_SIZE = 15;

export function applyFilters(alumni: Alumnus[], f: AlumniFilters): Alumnus[] {
  const q = f.q?.trim().toLowerCase();
  return alumni.filter((a) => {
    if (f.verifyStatus && a.verifyStatus !== f.verifyStatus) return false;
    if (f.featured && !a.isFeatured) return false;
    if (f.departmentId && a.departmentId !== f.departmentId) return false;
    if (f.passingYear && a.passingYear !== f.passingYear) return false;
    if (f.gender && a.gender !== f.gender) return false;
    if (f.city && a.city !== f.city) return false;
    if (f.district && a.district !== f.district) return false;
    if (f.employer && !a.employer?.includes(f.employer)) return false;
    if (f.sector && a.sector !== f.sector) return false;
    if (f.session) {
      const [s, e] = f.session.split("–").map((x) => parseInt(x, 10));
      if (!Number.isNaN(s) && a.sessionStartYear !== s) return false;
      if (!Number.isNaN(e) && a.sessionEndYear !== e) return false;
    }
    if (q) {
      const hay = `${a.fullName} ${a.rollNumber} ${a.email}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sortAlumni(alumni: Alumnus[], sort?: string): Alumnus[] {
  const [key, dir] = (sort ?? "name").split(":");
  const d = dir === "desc" ? -1 : 1;
  return [...alumni].sort((a, b) => {
    switch (key) {
      case "roll":
        return d * a.rollNumber.localeCompare(b.rollNumber);
      case "year":
        return d * (a.passingYear - b.passingYear);
      case "city":
        return d * (a.city ?? "").localeCompare(b.city ?? "");
      case "department":
        return d * a.departmentName.localeCompare(b.departmentName);
      default:
        return d * a.fullName.localeCompare(b.fullName);
    }
  });
}

export function createDirectoryAdapter(
  alumni: Alumnus[],
  requests: AlumniChangeRequest[],
  departments: Department[],
): AlumniDirectoryPort {
  const mut = {
    alumni: alumni.map((a) => ({ ...a })),
    requests: requests.map((r) => ({ ...r })),
  };
  return {
    listAlumni(f: AlumniFilters): Paged<Alumnus> {
      const filtered = sortAlumni(applyFilters(mut.alumni, f), f.sort);
      const page = f.page ?? 1;
      const start = (page - 1) * PAGE_SIZE;
      return {
        items: filtered.slice(start, start + PAGE_SIZE),
        total: filtered.length,
        page,
        pageSize: PAGE_SIZE,
      };
    },
    getAlumnus: (id) => mut.alumni.find((a) => a.id === id),
    tabCounts: () => ({
      verified: mut.alumni.filter((a) => a.verifyStatus === "verified").length,
      under_approval: mut.alumni.filter(
        (a) => a.verifyStatus === "under_approval",
      ).length,
      rejected: mut.alumni.filter((a) => a.verifyStatus === "rejected").length,
      requests: mut.requests.filter((r) => r.status === "pending").length,
    }),
    filterOptions: () => ({
      departments: departments.filter((d) => d.isActive),
      passingYears: [...new Set(mut.alumni.map((a) => a.passingYear))].sort(),
      cities: [
        ...new Set(
          mut.alumni.map((a) => a.city).filter((c): c is string => !!c),
        ),
      ].sort(),
      districts: [
        ...new Set(
          mut.alumni.map((a) => a.district).filter((c): c is string => !!c),
        ),
      ].sort(),
      employers: [
        ...new Set(
          mut.alumni.map((a) => a.employer).filter((c): c is string => !!c),
        ),
      ].sort(),
      sectors: [
        ...new Set(
          mut.alumni.map((a) => a.sector).filter((c): c is string => !!c),
        ),
      ].sort(),
    }),
    decide: (ids, decision, reason) => {
      let n = 0;
      for (const a of mut.alumni) {
        if (ids.includes(a.id)) {
          a.verifyStatus = decision === "approve" ? "verified" : "rejected";
          a.rejectReason = decision === "reject" ? (reason ?? null) : null;
          n++;
        }
      }
      return n;
    },
    feature: (ids, featured) => {
      let n = 0;
      for (const a of mut.alumni) {
        if (ids.includes(a.id)) {
          a.isFeatured = featured;
          if (!featured) a.achievement = null;
          n++;
        }
      }
      return n;
    },
    listChangeRequests: (status) =>
      mut.requests.filter((r) => !status || r.status === status),
    decideChangeRequest: (id, decision, note) => {
      const r = mut.requests.find((x) => x.id === id);
      if (r) {
        r.status = decision === "approve" ? "approved" : "rejected";
        r.reviewNote = note ?? null;
        r.reviewedAt = "now";
      }
    },
  };
}
