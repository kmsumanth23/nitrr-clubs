"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/supabase__server";
import { applicationSchema } from "@/lib/validation/application";

export type ApplyResult = { error?: string; alreadyApplied?: boolean };

/**
 * Submit an application. RLS gate 2: the insert policy enforces
 * profile_id = auth.uid(), so a student can only create their own row.
 * The unique (club_id, profile_id) constraint = one application per club;
 * we catch the duplicate (Postgres error 23505) and report it nicely.
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
    if (error.code === "23505") {
      return { alreadyApplied: true };
    }
    return { error: error.message };
  }

  revalidatePath("/profile");
  redirect("/profile?applied=1");
}
