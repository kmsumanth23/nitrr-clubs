import { z } from "zod";

export const clubEditSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Name is required").max(120),
  tagline: z.string().max(140).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  highlights: z.array(z.string().min(2).max(80)).max(8).default([]),
  is_recruiting: z.boolean().default(true),
  recruitment_deadline: z.string().datetime().nullable().optional(),
  result_date: z.string().datetime().nullable().optional(),
  member_count: z.coerce.number().int().min(0).max(100000).nullable().optional(),
  instagram_url: z.string().url().nullable().optional().or(z.literal("")),
  linkedin_url: z.string().url().nullable().optional().or(z.literal("")),
  community_whatsapp_link: z
    .string()
    .url()
    .max(500)
    .nullable()
    .optional()
    .or(z.literal("")),
});

export type ClubEditInput = z.infer<typeof clubEditSchema>;
