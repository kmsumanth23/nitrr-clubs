import { z } from "zod";

export const addAdminSchema = z.object({
  clubId: z.string().uuid(),
  profileId: z.string().uuid(),
  tier: z.enum(["lead", "manager", "editor"]),
});

export const removeAdminSchema = z.object({
  clubId: z.string().uuid(),
  profileId: z.string().uuid(),
});

export const changeTierSchema = z.object({
  clubId: z.string().uuid(),
  profileId: z.string().uuid(),
  newTier: z.enum(["lead", "manager", "editor"]),
});
