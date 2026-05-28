"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { applicationSchema } from "@/lib/validation/application";
import { isOpen, CLOSED_MESSAGE } from "@/lib/deadline";

export type ApplyResult = {
  error?: string;
  alreadyApplied?: boolean;
  withdrawnClosed?: boolean;
};

async function clubDeadline(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clubId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("clubs")
    .select("recruitment_deadline")
    .eq("id", clubId)
    .maybeSingle();
  return data?.recruitment_deadline ?? null;
}

/**
 * Submit (or re-submit) an application.
 *  - Deadline wall: now < club.recruitment_deadline (checked here + DB trigger).
 *  - Re-apply after withdraw WITHIN the window: we revive the same row
 *    (status → pending) so the unique (club_id, profile_id) doesn't block it.
 *  - Active duplicate: "already applied".
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
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in to apply." };

  const { clubId, motivation, experience, contribution } = parsed.data;
  const responses = { motivation, experience: experience ?? "", contribution };

  // deadline wall
  const dl = await clubDeadline(supabase, clubId);
  if (!isOpen(dl)) return { error: CLOSED_MESSAGE };

  // is there an existing row for this (club, user)?
  const { data: existing } = await supabase
    .from("applications")
    .select("id, status")
    .eq("club_id", clubId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "withdrawn") {
      // re-apply within the window → revive the same row
      const { error } = await supabase
        .from("applications")
        .update({ status: "pending", responses })
        .eq("id", existing.id);
      if (error) return { error: error.message };
    } else {
      return { alreadyApplied: true };
    }
  } else {
    const { error } = await supabase.from("applications").insert({
      club_id: clubId,
      profile_id: user.id,
      responses,
    });
    if (error) {
      if (error.code === "23505") return { alreadyApplied: true };
      if (error.code === "P0001") return { error: error.message };
      return { error: error.message };
    }
  }

  revalidatePath("/profile");
  redirect("/profile?applied=1");
}

/** Edit an application's responses — allowed only before the deadline. */
export async function editApplication(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const id = formData.get("applicationId") as string | null;
  const motivation = (formData.get("motivation") as string) ?? "";
  const experience = (formData.get("experience") as string) ?? "";
  const contribution = (formData.get("contribution") as string) ?? "";
  if (!id) return { error: "Missing application id." };

  const supabase = await createClient();

  // find the club to check its deadline
  const { data: app } = await supabase
    .from("applications")
    .select("club_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!app) return { error: "Application not found." };

  const dl = await clubDeadline(supabase, app.club_id);
  if (!isOpen(dl)) return { error: CLOSED_MESSAGE };

  const { error } = await supabase
    .from("applications")
    .update({ responses: { motivation, experience, contribution } })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}

/**
 * Withdraw — allowed only before the deadline. Server checks the deadline (not
 * just the UI), closing the crafted-request hole. Sets status='withdrawn'.
 */
export async function withdrawApplication(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const id = formData.get("applicationId") as string | null;
  if (!id) return { error: "Missing application id." };

  const supabase = await createClient();

  const { data: app } = await supabase
    .from("applications")
    .select("club_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!app) return { error: "Application not found." };

  // only churn-able states, and only before the deadline
  if (!["pending", "reviewing"].includes(app.status)) {
    return { error: "This application can no longer be withdrawn." };
  }
  const dl = await clubDeadline(supabase, app.club_id);
  if (!isOpen(dl)) return { error: CLOSED_MESSAGE };

  const { error } = await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}
