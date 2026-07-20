import { z } from "zod";
import { ROLE_ENUM } from "@/lib/roles";

/** Update a single member's role (individual admin edit). */
export const updateMemberRoleSchema = z.object({
  clubId: z.string().uuid(),
  profileId: z.string().uuid(),
  role: z.enum(ROLE_ENUM),
  roleLabel: z.string().trim().max(100).optional().nullable(),
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

/** Toggle exclude_from_promote for a member. */
export const toggleExcludeSchema = z.object({
  clubId: z.string().uuid(),
  profileId: z.string().uuid(),
  exclude: z.boolean(),
});
export type ToggleExcludeInput = z.infer<typeof toggleExcludeSchema>;

/** Bulk-promote members. Selections are ordered [{profile_id, new_role}]. */
export const bulkPromoteSchema = z.object({
  clubId: z.string().uuid(),
  selections: z
    .array(
      z.object({
        profileId: z.string().uuid(),
        newRole: z.enum(ROLE_ENUM),
      }),
    )
    .min(1, "At least one member must be selected"),
});
export type BulkPromoteInput = z.infer<typeof bulkPromoteSchema>;
