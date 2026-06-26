import { z } from "zod";

/** Slugs: lowercase letters, digits, hyphens. Must start with a letter
 *  or digit (no leading/trailing hyphen). Max 50. */
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .trim(),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug must be at most 50 characters")
    .regex(
      SLUG_REGEX,
      "Slug must be lowercase letters, digits, hyphens (no leading or trailing hyphen)",
    ),
});

export type CategoryInput = z.infer<typeof categorySchema>;

/** Convert "Tech & Robotics" → "tech-robotics" for slug auto-fill. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}
