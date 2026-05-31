import { z } from "zod";

export const eventSchema = z.object({
  // present on edit, absent on create
  id: z.string().uuid().optional(),
  club_id: z.string().uuid(),
  slug: z
    .string()
    .min(3, "Slug is too short")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  title: z.string().min(2, "Title is required").max(160),
  description: z.string().max(4000).nullable().optional(),
  poster_url: z.string().url().nullable().optional().or(z.literal("")),
  venue: z.string().max(160).nullable().optional(),
  starts_at: z.string().datetime().nullable().optional(),
  ends_at: z.string().datetime().nullable().optional(),
  reg_open: z.boolean().default(true),
  reg_url: z.string().url().nullable().optional().or(z.literal("")),
});

export type EventInput = z.infer<typeof eventSchema>;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
