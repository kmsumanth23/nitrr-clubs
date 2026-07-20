"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  updateMemberRoleSchema,
  toggleExcludeSchema,
  bulkPromoteSchema,
} from "@/lib/validation/member";

/** Flat all-optional result shape shared by all member actions (matches the
 *  AuthResult / DriveResult / ReviewResult convention). `promoted_count` is
 *  set by `bulkPromoteMembers`; the other actions leave it undefined. */
export type MemberResult = {
  error?: string;
  ok?: boolean;
  promoted_count?: number;
};

/** Back-compat alias — 17B introduced `MemberActionResult` in the goal spec.
 *  Kept as a re-export so future files can use either name. */
export type MemberActionResult = MemberResult;

function revalidateMembers(clubSlug: string) {
  revalidatePath(`/admin/clubs/${clubSlug}/members`);
  revalidatePath(`/admin/clubs/${clubSlug}`);
  revalidatePath(`/profile`);
}

export async function removeMember(
  _prev: MemberResult,
  formData: FormData,
): Promise<MemberResult> {
  const clubId = formData.get("clubId") as string;
  const profileId = formData.get("profileId") as string;
  const clubSlug = formData.get("__club_slug") as string;
  if (!clubId || !profileId) return { error: "Missing fields." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", {
    club_id_in: clubId,
    profile_id_in: profileId,
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/clubs/${clubSlug}/members`);
  revalidatePath(`/admin/clubs/${clubSlug}/applications`);
  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true };
}

// ============================================================================
// 17B — Role management
// ============================================================================

export async function updateMemberRole(
  _prev: MemberResult,
  formData: FormData,
): Promise<MemberResult> {
  const clubSlug = formData.get("__club_slug") as string;

  const parsed = updateMemberRoleSchema.safeParse({
    clubId: formData.get("clubId"),
    profileId: formData.get("profileId"),
    role: formData.get("role"),
    roleLabel: formData.get("roleLabel") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_member_role", {
    club_id_in: parsed.data.clubId,
    profile_id_in: parsed.data.profileId,
    role_in: parsed.data.role,
    role_label_in: parsed.data.roleLabel ?? null,
  } as never);
  if (error) {
    console.error("updateMemberRole rpc failed:", error);
    return { error: error.message };
  }

  revalidateMembers(clubSlug);
  return { ok: true };
}

export async function toggleMemberExclude(
  _prev: MemberResult,
  formData: FormData,
): Promise<MemberResult> {
  const clubSlug = formData.get("__club_slug") as string;

  const parsed = toggleExcludeSchema.safeParse({
    clubId: formData.get("clubId"),
    profileId: formData.get("profileId"),
    exclude: formData.get("exclude") === "true",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("toggle_member_exclude_from_promote", {
    club_id_in: parsed.data.clubId,
    profile_id_in: parsed.data.profileId,
    exclude_in: parsed.data.exclude,
  } as never);
  if (error) {
    console.error("toggleMemberExclude rpc failed:", error);
    return { error: error.message };
  }

  revalidateMembers(clubSlug);
  return { ok: true };
}

export async function bulkPromoteMembers(
  _prev: MemberResult,
  formData: FormData,
): Promise<MemberResult> {
  const clubSlug = formData.get("__club_slug") as string;

  const selectionsJson = (formData.get("selections") as string) ?? "[]";
  let rawSelections: unknown;
  try {
    rawSelections = JSON.parse(selectionsJson);
  } catch {
    return { error: "Invalid selections payload." };
  }

  const parsed = bulkPromoteSchema.safeParse({
    clubId: formData.get("clubId"),
    selections: rawSelections,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bulk_promote_members", {
    club_id_in: parsed.data.clubId,
    member_selections: parsed.data.selections.map((s) => ({
      profile_id: s.profileId,
      new_role: s.newRole,
    })),
  } as never);
  if (error) {
    console.error("bulkPromoteMembers rpc failed:", error);
    return { error: error.message };
  }

  revalidateMembers(clubSlug);
  return { ok: true, promoted_count: data as unknown as number };
}
