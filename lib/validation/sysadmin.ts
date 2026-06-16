import { z } from "zod";

export const setSuperAdminSchema = z.object({
  profileId: z.string().uuid(),
  value: z.coerce.boolean(),
});

export const createClubSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
      message: "Slug must be lowercase letters, numbers, and hyphens only.",
    }),
  categoryId: z.string().uuid().nullable().optional(),
  initialLeadProfileId: z.string().uuid(),
});

export const clubIdSchema = z.object({
  clubId: z.string().uuid(),
});
