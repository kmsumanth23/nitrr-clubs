"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { applicationSchema } from "@/lib/validation/application";

export type ApplyResult = { error?: string; alreadyApplied?: boolean };

/**
 * Submit an application. RLS gate 2: the insert policy enforces
 * profile_id = auth.uid(). Unique (club_id, profile_id) => one application per
 * club; we catch 23505 as "already applied". The 09_roles.sql trigger also
 * raises a friendly error (code P0001) if you try to apply to a club you
 * manage or are already a member of.
 */
export async function submitApplication(
  _prev: ApplyResult,
  formData: FormData,
): Promise<ApplyResult> {
  const parsed = applicationSchema.safeParse({
    clubId: formData.get("clubId"),
    motivation: formData.get("motivation"),
    experience: formData.get("experience"),
    contribution: formData.get("contribution"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in to apply." };

  const { clubId, motivation, experience, contribution } = parsed.data;

  const { error } = await supabase.from("applications").insert({
    club_id: clubId,
    profile_id: user.id,
    responses: { motivation, experience: experience ?? "", contribution },
  });

  if (error) {
    if (error.code === "23505") return { alreadyApplied: true };
    if (error.code === "P0001") return { error: error.message };
    return { error: error.message };
  }

  revalidatePath("/profile");
  redirect("/profile?applied=1");
}

/**
 * Withdraw an application. RLS "applications: student update own" enforces
 * profile_id = auth.uid(), so a student can only withdraw their own.
 */
export async function withdrawApplication(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const id = formData.get("applicationId") as string | null;
  if (!id) return { error: "Missing application id." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}
