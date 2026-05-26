import { z } from "zod";

export const BRANCHES = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Metallurgical Engineering",
  "Mining Engineering",
  "Biomedical Engineering",
  "Biotechnology",
  "Architecture",
  "Other",
] as const;

export const completeProfileSchema = z.object({
  full_name: z.string().min(2, "Enter your name"),
  roll_number: z.string().min(3, "Enter your roll number"),
  year: z.coerce.number().int().min(1).max(5),
  branch: z.enum(BRANCHES, { message: "Select your branch" }),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
});

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
