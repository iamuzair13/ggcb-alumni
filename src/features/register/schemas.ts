/** Registration schema — mirrors server-side constraints (§4.2, §6). */
import { z } from "zod";

const YEAR_MIN = 1950;
const YEAR_MAX = new Date().getFullYear() + 6;

export const registrationSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(80),
    rollNumber: z
      .string()
      .trim()
      .min(1, "Enter your roll number.")
      .max(32)
      .transform((v) => v.toLowerCase()),
    departmentId: z.string().min(1, "Choose your department."),
    sessionStartYear: z.coerce.number().int().min(YEAR_MIN).max(YEAR_MAX),
    sessionEndYear: z.coerce.number().int().min(YEAR_MIN).max(YEAR_MAX),
    passingYear: z.coerce
      .number()
      .int()
      .min(YEAR_MIN, "Enter a real passing year.")
      .max(YEAR_MAX),
    email: z.string().trim().email("Enter a valid email address.").max(254),
    phone: z
      .string()
      .trim()
      .min(7, "Enter a phone number.")
      .max(20)
      .regex(/^[\d+()\- ]+$/, "Numbers, +, spaces and dashes only."),
    password: z.string().min(10, "Use at least 10 characters.").max(128),
    confirmPassword: z.string(),
    consent: z.literal(true, {
      error: "Please accept the consent statement to continue.",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
  .refine((d) => d.sessionEndYear > d.sessionStartYear, {
    path: ["sessionEndYear"],
    message: "Session end must be after the start year.",
  })
  .refine((d) => d.passingYear >= d.sessionEndYear - 1, {
    path: ["passingYear"],
    message: "Passing year should be at or after the session end.",
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;

/**
 * Full production draft — every alumni field the register takes, split by
 * schema nullability. Optional fields accept "" and store as undefined.
 * Same refinements as registrationSchema; keep them in step.
 */
const optionalText = (max: number) => z.string().trim().max(max).default("");

export const registerFormSchema = z
  .object({
    // Required — the fields the register cannot place a person without.
    fullName: z.string().trim().min(2, "Enter your full name.").max(80),
    rollNumber: z
      .string()
      .trim()
      .min(1, "Enter your roll number.")
      .max(32)
      .transform((v) => v.toLowerCase()),
    departmentId: z.string().min(1, "Choose your department."),
    sessionStartYear: z.coerce.number().int().min(YEAR_MIN).max(YEAR_MAX),
    sessionEndYear: z.coerce.number().int().min(YEAR_MIN).max(YEAR_MAX),
    passingYear: z.coerce
      .number()
      .int()
      .min(YEAR_MIN, "Enter a real passing year.")
      .max(YEAR_MAX),
    email: z.string().trim().email("Enter a valid email address.").max(254),
    phone: z
      .string()
      .trim()
      .min(7, "Enter a phone number.")
      .max(20)
      .regex(/^[\d+()\- ]+$/, "Numbers, +, spaces and dashes only."),
    password: z.string().min(10, "Use at least 10 characters.").max(128),
    confirmPassword: z.string(),
    consent: z.literal(true, {
      error: "Please accept the consent statement to continue.",
    }),
    // Optional — schema-nullable alumni fields, offered but not demanded.
    gender: z.enum(["male", "female", "other"]).or(z.literal("")).default(""),
    city: optionalText(80),
    district: optionalText(80),
    country: optionalText(80),
    employer: optionalText(80),
    jobTitle: optionalText(80),
    sector: optionalText(80),
    bio: optionalText(1000),
    linkedin: z
      .string()
      .trim()
      .url("Enter a full link, https://…")
      .max(200)
      .or(z.literal(""))
      .default(""),
    mentorAvailable: z.boolean().default(false),
    directoryVisible: z.boolean().default(false),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
  .refine((d) => d.sessionEndYear > d.sessionStartYear, {
    path: ["sessionEndYear"],
    message: "Session end must be after the start year.",
  })
  .refine((d) => d.passingYear >= d.sessionEndYear - 1, {
    path: ["passingYear"],
    message: "Passing year should be at or after the session end.",
  });

export type RegisterFormDraft = z.infer<typeof registerFormSchema>;
