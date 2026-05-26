"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/supabase__server";
import { completeProfileSchema } from "@/lib/validation/profile";

export type ProfileResult = { error?: string };

/**
 * Save the profile fields (used by /profile/complete). Updates the row the
 * signup trigger already created. RLS "profiles: update own" enforces id =
 * auth.uid(). Redirects to `next` (e.g. back to the apply form) on success.
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

  const next = (formData.get("next") as string) || "/profile";
  redirect(next);
}
