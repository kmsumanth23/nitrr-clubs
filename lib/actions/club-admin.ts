"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  addAdminSchema,
  removeAdminSchema,
  changeTierSchema,
} from "@/lib/validation/club-admin";

export type AdminActionResult = { error?: string; ok?: boolean };

export async function addClubAdmin(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const clubSlug = formData.get("__club_slug") as string;
  const parsed = addAdminSchema.safeParse({
    clubId: formData.get("clubId"),
    profileId: formData.get("profileId"),
    tier: formData.get("tier"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_club_admin", {
    club_id_in: parsed.data.clubId,
    profile_id_in: parsed.data.profileId,
    tier_in: parsed.data.tier,
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/clubs/${clubSlug}/admins`);
  revalidatePath(`/admin/clubs/${clubSlug}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function removeClubAdmin(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const clubSlug = formData.get("__club_slug") as string;
  const parsed = removeAdminSchema.safeParse({
    clubId: formData.get("clubId"),
    profileId: formData.get("profileId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_club_admin", {
    club_id_in: parsed.data.clubId,
    profile_id_in: parsed.data.profileId,
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/clubs/${clubSlug}/admins`);
  revalidatePath(`/admin/clubs/${clubSlug}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function changeClubAdminTier(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const clubSlug = formData.get("__club_slug") as string;
  const parsed = changeTierSchema.safeParse({
    clubId: formData.get("clubId"),
    profileId: formData.get("profileId"),
    newTier: formData.get("newTier"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("change_club_admin_tier", {
    club_id_in: parsed.data.clubId,
    profile_id_in: parsed.data.profileId,
    new_tier_in: parsed.data.newTier,
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/clubs/${clubSlug}/admins`);
  revalidatePath(`/admin/clubs/${clubSlug}`);
  revalidatePath("/admin");
  return { ok: true };
}
