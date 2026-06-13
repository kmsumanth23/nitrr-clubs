import { z } from "zod";

export const captionSchema = z.object({
  photoId: z.string().uuid(),
  caption: z.string().max(280).nullable().optional(),
});

export const reorderSchema = z.object({
  photoId: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

export const homepageToggleSchema = z.object({
  photoId: z.string().uuid(),
  show: z.coerce.boolean(),
});

export const deleteSchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1),
});

export const createPhotoSchema = z.object({
  clubId: z.string().uuid(),
  clubSlug: z.string().min(1),
  path: z.string().min(1),
  imageUrl: z.string().url(),
  caption: z.string().max(280).nullable().optional(),
});
