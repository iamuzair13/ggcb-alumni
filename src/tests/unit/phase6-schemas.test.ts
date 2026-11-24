import { describe, expect, it } from "vitest";
import { registrationSchema } from "@/features/register/schemas";
import {
  changeRequestSchema,
  profileEditSchema,
} from "@/features/profile/schemas";
import { changePasswordSchema } from "@/features/account/schemas";
import { storySchema } from "@/features/stories/schemas";
import { eventSchema } from "@/features/events/schemas";
import { announcementSchema } from "@/features/announcements/schemas";
import { opportunitySchema } from "@/features/opportunities/schemas";
import { alumniFiltersSchema } from "@/features/alumni-directory/schemas";
import { exportSchema } from "@/features/import-export/schemas";

const validRegistration = {
  fullName: "Sample Ayesha Khan",
  rollNumber: "GG-2019-0001",
  departmentId: "dep-1",
  sessionStartYear: 2019,
  sessionEndYear: 2023,
  passingYear: 2023,
  email: "sample@example.invalid",
  phone: "+92 300 1234567",
  password: "correct-horse-battery",
  confirmPassword: "correct-horse-battery",
  consent: true,
};

describe("registrationSchema", () => {
  it("accepts a valid submission and normalises the roll number", () => {
    const r = registrationSchema.safeParse(validRegistration);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.rollNumber).toBe("gg-2019-0001");
  });
  it.each([
    ["fullName", { fullName: "X" }],
    ["rollNumber", { rollNumber: "" }],
    ["departmentId", { departmentId: "" }],
    ["email", { email: "not-an-email" }],
    ["phone", { phone: "abc" }],
    ["password", { password: "short", confirmPassword: "short" }],
    ["confirmPassword", { confirmPassword: "different-pass-here" }],
    ["consent", { consent: false }],
    ["passingYear", { passingYear: 1900 }],
  ])("rejects invalid %s", (field, patch) => {
    const r = registrationSchema.safeParse({ ...validRegistration, ...patch });
    expect(r.success, field).toBe(false);
  });
  it("rejects Unicode-free names only via length — unicode names pass", () => {
    const r = registrationSchema.safeParse({
      ...validRegistration,
      fullName: "عائشہ خان نائیک عباس",
    });
    expect(r.success).toBe(true);
  });
  it("rejects session end before start", () => {
    const r = registrationSchema.safeParse({
      ...validRegistration,
      sessionEndYear: 2018,
    });
    expect(r.success).toBe(false);
  });
});

describe("profileEditSchema + changeRequestSchema", () => {
  const validProfile = {
    phone: "+92 300 1234567",
    city: "Burewala",
    district: "Vehari",
    country: "Pakistan",
    employer: "Sample School",
    jobTitle: "Teacher",
    sector: "Education",
    bio: "A short bio.",
    linkedin: "https://example.invalid/in/sample",
    mentorAvailable: true,
    directoryVisible: true,
    showEmail: false,
    showPhone: false,
  };
  it("accepts a valid edit; rejects bio > 1000 chars", () => {
    expect(profileEditSchema.safeParse(validProfile).success).toBe(true);
    expect(
      profileEditSchema.safeParse({ ...validProfile, bio: "x".repeat(1001) })
        .success,
    ).toBe(false);
  });
  it("change request requires field + new value", () => {
    expect(
      changeRequestSchema.safeParse({
        field: "passingYear",
        newValue: "2024",
        note: "",
      }).success,
    ).toBe(true);
    expect(
      changeRequestSchema.safeParse({
        field: "unknown_field",
        newValue: "x",
        note: "",
      }).success,
    ).toBe(false);
  });
});

describe("content schemas", () => {
  it("storySchema enforces 50–5000 char body", () => {
    expect(
      storySchema.safeParse({ title: "My story", content: "x".repeat(49) })
        .success,
    ).toBe(false);
    expect(
      storySchema.safeParse({ title: "My story", content: "x".repeat(51) })
        .success,
    ).toBe(true);
    expect(
      storySchema.safeParse({ title: "My story", content: "x".repeat(5001) })
        .success,
    ).toBe(false);
  });
  it("eventSchema + announcementSchema + opportunitySchema basics", () => {
    expect(
      eventSchema.safeParse({
        type: "reunion",
        title: "Reunion",
        description: "",
        startsAt: "2027-03-01",
        venue: "Hall",
        isPublished: true,
      }).success,
    ).toBe(true);
    expect(
      eventSchema.safeParse({
        type: "gala", // not an enum value
        title: "Reunion",
        description: "",
        startsAt: "2027-03-01",
        venue: "Hall",
        isPublished: true,
      }).success,
    ).toBe(false);
    expect(
      announcementSchema.safeParse({
        title: "Hi",
        body: "x",
        publishAt: "2026-01-01",
        isPinned: false,
        isPublished: true,
      }).success,
    ).toBe(false); // title < 3
    expect(
      opportunitySchema.safeParse({
        type: "job",
        title: "Job",
        organization: "Org",
        description: "",
        deadline: "2027-01-01",
        applyUrl: "not-a-url",
        isPublished: true,
      }).success,
    ).toBe(false);
  });
});

describe("filter + misc schemas", () => {
  it("alumniFiltersSchema coerces + bounds", () => {
    const r = alumniFiltersSchema.safeParse({
      q: "test",
      passingYear: "2024",
      page: "2",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.passingYear).toBe(2024);
      expect(r.data.page).toBe(2);
    }
  });
  it("changePasswordSchema enforces confirm match", () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "old-pass-1234",
        newPassword: "new-password-1",
        confirmPassword: "different",
      }).success,
    ).toBe(false);
  });
  it("exportSchema requires at least one column", () => {
    expect(exportSchema.safeParse({ columns: [], format: "csv" }).success).toBe(
      false,
    );
    expect(
      exportSchema.safeParse({ columns: ["fullName"], format: "xlsx" }).success,
    ).toBe(true);
  });
});
