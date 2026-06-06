"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { applicationSchema } from "@/lib/validation/application";
import { getPhase } from "@/lib/phase";

export type ApplicationResult = { error?: string; ok?: boolean };

/**
 * Apply: targets the club's CURRENT recruitment row. If the student already
 * has an application for that recruitment in a revivable state, update it
 * (re-apply within the same recruitment). The DB trigger enforces phase.
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
    .select("slug, is_recruiting")
    .eq("id", clubId)
    .maybeSingle();
  if (!club) return { error: "Club not found." };
  if (!club.is_recruiting) return { error: "This club is not currently recruiting." };

  // Current recruitment for the club
  const { data: rec } = await supabase
    .from("recruitments")
    .select("id, deadline, result_date, results_published_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!rec) return { error: "No active recruitment for this club." };

  const phase = getPhase(rec);
  if (phase !== "open") return { error: "Applications are closed for this recruitment." };

  // Existing app for THIS recruitment? Revive (the trigger enforces phase).
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("recruitment_id", rec.id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("applications")
      .update({ status: "pending", responses })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("applications").insert({
      club_id: clubId,
      recruitment_id: rec.id,
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

/** Edit own application. Open phase only. */
export async function editApplication(
  _prev: ApplicationResult,
  formData: FormData,
): Promise<ApplicationResult> {
  const applicationId = formData.get("applicationId") as string;
  if (!applicationId) return { error: "Missing application id." };

  const parsed = applicationSchema.omit({ clubId: true }).safeParse({
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
      "id, profile_id, recruitment:recruitments(deadline, result_date, results_published_at)",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || app.profile_id !== user.id) return { error: "Application not found." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec: any = app.recruitment;
  const phase = getPhase(rec);
  if (phase !== "open") return { error: "You can no longer edit this application." };

  const { error } = await supabase
    .from("applications")
    .update({ responses: parsed.data })
    .eq("id", applicationId);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}

/** Withdraw own application. Open phase only. */
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
      "id, profile_id, recruitment:recruitments(deadline, result_date, results_published_at)",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || app.profile_id !== user.id) return { error: "Application not found." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec: any = app.recruitment;
  const phase = getPhase(rec);
  if (phase !== "open") return { error: "You can no longer withdraw this application." };

  const { error } = await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}
