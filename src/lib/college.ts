/**
 * Single config module for college identity — context.md §13-D1/D11.
 * Everything here is a marked placeholder until the college supplies the
 * official name, logo, colours and contact details. Components must
 * import from here instead of hard-coding institutional text.
 */
export const COLLEGE = {
  name: "Government Postgraduate College Burewala",
  shortName: "GGCB",
  fullName: "Government Postgraduate College Burewala (GGCB)",
  /** [Placeholder] — D1/D11: official contact details to be supplied. */
  contact: {
    email: "[Placeholder: alumni office email]",
    phone: "[Placeholder: alumni office phone]",
    address: "[Placeholder: college address]",
    office: "Alumni Office",
  },
} as const;
