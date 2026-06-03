"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { applicationSchema } from "@/lib/validation/application";
import { getPhase } from "@/lib/phase";

export type ApplicationResult = { error?: string; ok?: boolean };

/**
 * Apply to a club. Allowed only in 'open' phase. Also handles re-apply:
 * if the student has a previous withdrawn/rejected/removed app for this
 * club within the current cycle, we update it back to pending. After
 * publish, the cycle is over and `removed` blocks re-apply (handled below).
 */
export async function submitApplication(
  _prev: ApplicationResult,
  formData: FormData,
): Promise<ApplicationResult> {
  const parsed = applicationSchema.safeParse({
    clubId: formData.get("clubId"),
    motivation: formData.get("motivation"),
    experience: formData.get("experience"),
    contribution: formData.get("contribution"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { clubId, ...responses } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };

  const { data: club } = await supabase
    .from("clubs")
    .select(
      "slug, recruitment_deadline, result_date, results_published_at, is_recruiting",
    )
    .eq("id", clubId)
    .maybeSingle();
  if (!club) return { error: "Club not found." };
  if (!club.is_recruiting)
    return { error: "This club is not currently recruiting." };

  const phase = getPhase(club);
  if (phase !== "open") {
    return { error: "Applications are closed for this club." };
  }

  // If a previous app exists for this club from this user, re-use the row.
  const { data: existing } = await supabase
    .from("applications")
    .select("id, status")
    .eq("club_id", clubId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    // Trust the trigger to enforce phase rules — if we're in a fresh open
    // phase (new cycle), reviving any prior status (withdrawn / rejected /
    // accepted / removed) is fine. The trigger will block this update
    // outside open phase, and we surface that error to the user.
    const { error } = await supabase
      .from("applications")
      .update({ status: "pending", responses })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("applications").insert({
      club_id: clubId,
      profile_id: user.id,
      status: "pending",
      responses,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath(`/clubs/${club.slug}`);
  redirect("/profile");
}

/** Student edits their own application. Allowed only in 'open' phase. */
export async function editApplication(
  _prev: ApplicationResult,
  formData: FormData,
): Promise<ApplicationResult> {
  const applicationId = formData.get("applicationId") as string;
  if (!applicationId) return { error: "Missing application id." };

  const parsed = applicationSchema
    .omit({ clubId: true })
    .safeParse({
      motivation: formData.get("motivation"),
      experience: formData.get("experience"),
      contribution: formData.get("contribution"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };

  const { data: app } = await supabase
    .from("applications")
    .select(
      "id, profile_id, status, club:clubs(slug, recruitment_deadline, result_date, results_published_at)",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || app.profile_id !== user.id)
    return { error: "Application not found." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const club: any = app.club;
  const phase = getPhase(club);
  if (phase !== "open") {
    return { error: "You can no longer edit this application." };
  }

  const { error } = await supabase
    .from("applications")
    .update({ responses: parsed.data })
    .eq("id", applicationId);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}

/** Student withdraws their own application. Allowed only in 'open' phase. */
export async function withdrawApplication(
  _prev: ApplicationResult,
  formData: FormData,
): Promise<ApplicationResult> {
  const applicationId = formData.get("applicationId") as string;
  if (!applicationId) return { error: "Missing application id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };

  const { data: app } = await supabase
    .from("applications")
    .select(
      "id, profile_id, status, club:clubs(recruitment_deadline, result_date, results_published_at)",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || app.profile_id !== user.id)
    return { error: "Application not found." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const club: any = app.club;
  const phase = getPhase(club);
  if (phase !== "open") {
    return { error: "You can no longer withdraw this application." };
  }

  const { error } = await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}