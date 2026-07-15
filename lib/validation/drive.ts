import { z } from "zod";

/** Target years must be non-empty subset of {1,2,3,4} with no duplicates. */
const targetYearsSchema = z
  .array(z.number().int().min(1).max(4))
  .min(1, "Pick at least one year")
  .max(4, "Only years 1 to 4 are allowed")
  .refine(
    (arr) => new Set(arr).size === arr.length,
    "Duplicate years are not allowed",
  );

/** Deadline / result_date come from HTML datetime-local inputs and are
 *  formatted as `YYYY-MM-DDTHH:mm`. Empty string coerces to null. */
const nullableDatetime = z
  .string()
  .transform((v) => (v.trim() === "" ? null : v))
  .nullable()
  .refine(
    (v) => v === null || !isNaN(new Date(v).getTime()),
    "Invalid date",
  );

const nullableText = z
  .string()
  .transform((v) => (v.trim() === "" ? null : v.trim()))
  .nullable()
  .refine(
    (v) => v === null || v.length <= 2000,
    "Description too long (max 2000 chars)",
  );

/**
 * WhatsApp group invite link. Basic shape check — Supabase accepts anything,
 * so client-side validation is friendly-error-only. Accepts chat.whatsapp.com
 * invites as well as generic https URLs (some clubs use link shorteners).
 * 16C: mandatory on create + update.
 */
const whatsappLinkSchema = z
  .string()
  .trim()
  .min(1, "Interview WhatsApp link is required")
  .max(500, "Link is too long")
  .refine(
    (url) => /^https?:\/\//i.test(url),
    "Must be a valid URL starting with http:// or https://",
  );

/** Drive create — used by the /recruitment/new page. */
export const createDriveSchema = z.object({
  clubId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(120, "Name too long"),
  description: nullableText,
  targetYears: targetYearsSchema,
  deadline: nullableDatetime,
  resultDate: nullableDatetime,
  interviewWhatsappLink: whatsappLinkSchema, // 16C: mandatory
});

export type CreateDriveInput = z.infer<typeof createDriveSchema>;

/** Drive update — same shape but with driveId instead of clubId. */
export const updateDriveSchema = z.object({
  driveId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(120, "Name too long"),
  description: nullableText,
  targetYears: targetYearsSchema,
  deadline: nullableDatetime,
  resultDate: nullableDatetime,
  interviewWhatsappLink: whatsappLinkSchema, // 16C: mandatory
});

export type UpdateDriveInput = z.infer<typeof updateDriveSchema>;

/** Publish — just needs the drive id. */
export const publishDriveSchema = z.object({
  driveId: z.string().uuid(),
});

/** Delete — just needs the drive id. */
export const deleteDriveSchema = z.object({
  driveId: z.string().uuid(),
});

/** Add a new question to a drive. */
export const addQuestionSchema = z.object({
  driveId: z.string().uuid(),
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt is required")
    .max(500, "Prompt too long"),
  questionType: z.enum(["short_text", "long_text"]),
  required: z.boolean(),
});

export type AddQuestionInput = z.infer<typeof addQuestionSchema>;

/** Update a question's prompt / type / required. */
export const updateQuestionSchema = z.object({
  questionId: z.string().uuid(),
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt is required")
    .max(500, "Prompt too long"),
  questionType: z.enum(["short_text", "long_text"]),
  required: z.boolean(),
});

export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

/** Delete a question. */
export const deleteQuestionSchema = z.object({
  questionId: z.string().uuid(),
});

/** Swap two questions in the same drive. */
export const swapQuestionOrderSchema = z.object({
  questionAId: z.string().uuid(),
  questionBId: z.string().uuid(),
});
