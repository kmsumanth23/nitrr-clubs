import { z } from "zod";
import { slugify } from "@/lib/validation/category";

/** A single row in the bulk-import CSV. */
export const bulkImportRowSchema = z.object({
  name: z
    .string()
    .min(2, "name must be at least 2 characters")
    .max(100, "name must be at most 100 characters")
    .trim(),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
      "slug must be lowercase letters, digits, hyphens",
    )
    .max(60, "slug too long")
    .optional()
    .or(z.literal("")),
  category_slug: z
    .string()
    .min(1, "category_slug is required")
    .trim(),
  lead_roll_number: z
    .string()
    .min(1, "lead_roll_number is required")
    .trim(),
  tagline: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type BulkImportRow = z.infer<typeof bulkImportRowSchema>;

/** Normalize a row: auto-derive slug from name if blank. */
export function normalizeRow(row: BulkImportRow): BulkImportRow & { slug: string } {
  return {
    ...row,
    slug: row.slug && row.slug.length > 0 ? row.slug : slugify(row.name),
  };
}
