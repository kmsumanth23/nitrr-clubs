"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { completeProfileSchema } from "@/lib/validation/profile";

export type ProfileResult = { error?: string; ok?: boolean };

/**
 * Save the profile fields (used by /profile/complete and the dashboard edit).
 * Updates the row the signup trigger already created. RLS "profiles: update
 * own" enforces id = auth.uid().
 * If `next` is set, redirects to it (used by /profile/complete).
 * Otherwise returns ok:true so the in-page edit form can flip out of edit mode.
 */
export async function completeProfile(
  _prev: ProfileResult,
  formData: FormData,
): Promise<ProfileResult> {
  const parsed = completeProfileSchema.safeParse({
    full_name: formData.get("full_name"),
    roll_number: formData.get("roll_number"),
    year: formData.get("year"),
    branch: formData.get("branch"),
    gender: formData.get("gender") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/profile");

  const next = formData.get("next") as string | null;
  if (next && next.startsWith("/")) redirect(next);
  return { ok: true };
}

/** Aliased export the dashboard uses (same action). */
export const updateProfile = completeProfile;
