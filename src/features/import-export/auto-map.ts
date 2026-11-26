/**
 * Pure import column auto-mapping — headers → target fields.
 * Unit-tested; no DOM/DB so the future importer reuses it verbatim.
 */
import { IMPORT_TARGETS, type ImportColumnMapping } from "./types";

/** Header spelling variants → target field (lowercased, non-alnum stripped). */
const ALIASES: Record<string, string> = {
  rollnumber: "rollNumber",
  rollno: "rollNumber",
  "roll#": "rollNumber",
  roll: "rollNumber",
  universityrollnumber: "rollNumber",
  fullname: "fullName",
  name: "fullName",
  studentname: "fullName",
  candidatename: "fullName",
  department: "department",
  dept: "department",
  discipline: "department",
  subject: "department",
  sessionstart: "sessionStartYear",
  sessionfrom: "sessionStartYear",
  startyear: "sessionStartYear",
  sessionend: "sessionEndYear",
  sessionto: "sessionEndYear",
  endyear: "sessionEndYear",
  session: "sessionStartYear", // single "Session" col → start; admin adjusts
  passingyear: "passingYear",
  passyear: "passingYear",
  graduationyear: "passingYear",
  year: "passingYear",
  email: "email",
  emailaddress: "email",
  mail: "email",
  phone: "phone",
  mobilenumber: "phone",
  mobile: "phone",
  contact: "phone",
  contactnumber: "phone",
  city: "city",
  district: "district",
  employer: "employer",
  organization: "employer",
  organisation: "employer",
  company: "employer",
  jobtitle: "jobTitle",
  designation: "jobTitle",
  position: "jobTitle",
};

function normalise(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9#]/g, "");
}

/**
 * Suggest a mapping for each source header. Unrecognised headers map to
 * null (ignored); required targets missing a column are flagged by the
 * caller, not hidden.
 */
export function autoMapColumns(headers: string[]): ImportColumnMapping[] {
  const required = new Set<string>(
    IMPORT_TARGETS.filter((t) => t.required).map((t) => t.field),
  );
  const claimed = new Set<string>();
  return headers.map((sourceHeader) => {
    const guess = ALIASES[normalise(sourceHeader)];
    const targetField =
      guess && !claimed.has(guess) ? (claimed.add(guess), guess) : null;
    return {
      sourceHeader,
      targetField,
      required: targetField !== null && required.has(targetField),
    };
  });
}
