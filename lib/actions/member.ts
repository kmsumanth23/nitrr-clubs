"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MemberResult = { error?: string; ok?: boolean };

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
