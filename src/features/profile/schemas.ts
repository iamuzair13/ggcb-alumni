import { z } from "zod";

export const profileEditSchema = z.object({
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[\d+()\- ]*$/, "Numbers, +, spaces and dashes only.")
    .or(z.literal("")),
  city: z.string().trim().max(80),
  district: z.string().trim().max(80),
  country: z.string().trim().max(80),
  employer: z.string().trim().max(120),
  jobTitle: z.string().trim().max(120),
  sector: z.string().trim().max(120),
  bio: z.string().trim().max(1000, "Keep it under 1,000 characters."),
  linkedin: z
    .string()
    .url("Enter a full https:// link.")
    .max(200)
    .or(z.literal("")),
  mentorAvailable: z.boolean(),
  directoryVisible: z.boolean(),
  showEmail: z.boolean(),
  showPhone: z.boolean(),
});
export type ProfileEditInput = z.infer<typeof profileEditSchema>;

export const changeRequestSchema = z.object({
  field: z.enum([
    "fullName",
    "rollNumber",
    "departmentId",
    "session",
    "passingYear",
    "gender",
  ]),
  newValue: z.string().trim().min(1, "Enter the correct value.").max(120),
  note: z.string().trim().max(300),
});
export type ChangeRequestInput = z.infer<typeof changeRequestSchema>;
