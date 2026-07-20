import { z } from "zod";
import { ROLE_ENUM } from "@/lib/roles";

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

/** 17A: nullable variant for the drive-specific community link. Empty string
 *  becomes null so an unset field doesn't overwrite the club-level fallback. */
const optionalWhatsappLinkSchema = z
  .string()
  .trim()
  .max(500, "Link is too long")
  .refine(
    (url) => url === "" || /^https?:\/\//i.test(url),
    "Must be a valid URL starting with http:// or https://",
  )
  .transform((v) => (v === "" ? null : v))
  .nullable();

/** Drive create — used by the /recruitment/new page. */
export const createDriveSchema = z.object({
  clubId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(120, "Name too long"),
  description: nullableText,
  targetYears: targetYearsSchema,
  deadline: nullableDatetime,
  resultDate: nullableDatetime,
  interviewWhatsappLink: whatsappLinkSchema, // 16C: mandatory
  communityWhatsappLink: optionalWhatsappLinkSchema.optional(), // 17A: optional
  roleOnAccept: z.enum(ROLE_ENUM).default("volunteer"), // 17B
  roleLabel: z.string().trim().max(100).optional().nullable(), // 17B
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
  communityWhatsappLink: optionalWhatsappLinkSchema.optional(), // 17A: optional
  // 17B (defensive): no default on the update side — null means "preserve
  // existing" and the RPC's coalesce-preserve leaves the column alone.
  // Batch 2 UI always sends an explicit value; Batch 1 UI omits the field
  // entirely so passing null prevents the interstitial clobber-to-'volunteer'.
  // `createDriveSchema` keeps its `.default("volunteer")` — new drives don't
  // have a prior value to preserve.
  roleOnAccept: z.enum(ROLE_ENUM).optional().nullable(), // 17B
  roleLabel: z.string().trim().max(100).optional().nullable(), // 17B
});

/** 17A: post-publish carve-out — only community link is editable via the
 *  dedicated RPC, no phase gate. */
export const updateDriveCommunityLinkSchema = z.object({
  driveId: z.string().uuid(),
  communityWhatsappLink: optionalWhatsappLinkSchema,
});

export type UpdateDriveCommunityLinkInput = z.infer<
  typeof updateDriveCommunityLinkSchema
>;

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
