import { z } from "zod";

/**
 * Generic application questions (option a) — same for every club, stored in
 * the applications.responses jsonb. Moving to per-club questions later needs
 * no schema change.
 */
export const applicationSchema = z.object({
  clubId: z.string().uuid(),
  motivation: z
    .string()
    .min(20, "Tell us a bit more — at least 20 characters.")
    .max(1000),
  experience: z.string().max(1000).optional().or(z.literal("")),
  contribution: z
    .string()
    .min(10, "A sentence or two, please.")
    .max(1000),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

/** Shape stored in responses jsonb. */
export type ApplicationResponses = {
  motivation: string;
  experience: string;
  contribution: string;
};
