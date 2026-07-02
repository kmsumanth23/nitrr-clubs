"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPhase } from "@/lib/phase";
import { sendApplicationResultEmails } from "@/lib/email/send-application-results";
import type { ApplicationStatus } from "@/lib/database.types";

export type ReviewResult = { error?: string; ok?: boolean };

async function ensureCanManageApplications(
  clubId: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const [{ data: profile }, { data: adminRow }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("club_admins")
      .select("admin_role")
      .eq("club_id", clubId)
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  const isSuper = profile?.role === "super_admin";
  const tier = adminRow?.admin_role;
  const canManage = isSuper || tier === "manager" || tier === "lead";
  if (!canManage)
    return { ok: false, error: "You don't have access to manage applications." };
  return { ok: true, userId: user.id };
}

/** Set status. Phase-aware (decisions only in review). No club_members write —
 *  that happens at publish-time via the RPC. */
export async function setApplicationStatus(
  _prev: ReviewResult,
  formData: FormData,
): Promise<ReviewResult> {
  const applicationId = formData.get("applicationId") as string;
  const next = formData.get("next") as ApplicationStatus;
  const clubSlug = formData.get("__club_slug") as string;

  if (!applicationId || !next) return { error: "Missing fields." };
  if (!["pending", "reviewing", "accepted", "rejected"].includes(next)) {
    return { error: "That status is not allowed from the admin side." };
  }

  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select(
      "club_id, status, recruitment:recruitments(deadline, result_date, results_published_at)",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (!app) return { error: "Application not found." };

  const auth = await ensureCanManageApplications(app.club_id);
  if (!auth.ok) return { error: auth.error };

  if (app.status === "withdrawn")
    return { error: "This application was withdrawn by the student." };
  if (app.status === "removed")
    return { error: "This member was removed; status cannot change here." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec: any = app.recruitment;
  const phase = getPhase(rec);
  if (phase === "open") {
    return {
      error:
        "Decisions open after the recruitment deadline. You can read and add notes now.",
    };
  }
  if (phase === "result") {
    return { error: "Results have been published. This application is locked." };
  }

  const { error: updErr } = await supabase
    .from("applications")
    .update({ status: next })
    .eq("id", applicationId);
  if (updErr) return { error: updErr.message };

  revalidatePath(`/admin/clubs/${clubSlug}/applications`);
  revalidatePath("/profile");
  return { ok: true };
}

export async function saveApplicationNote(
  _prev: ReviewResult,
  formData: FormData,
): Promise<ReviewResult> {
  const applicationId = formData.get("applicationId") as string;
  const note = (formData.get("note") as string) ?? "";
  const clubSlug = formData.get("__club_slug") as string;
  if (!applicationId) return { error: "Missing application id." };

  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("club_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app) return { error: "Application not found." };

  const auth = await ensureCanManageApplications(app.club_id);
  if (!auth.ok) return { error: auth.error };

  const trimmed = note.trim();
  const { error } = await supabase
    .from("applications")
    .update({
      note: trimmed || null,
      note_by: trimmed ? auth.userId : null,
      note_at: trimmed ? new Date().toISOString() : null,
    })
    .eq("id", applicationId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/clubs/${clubSlug}/applications`);
  return { ok: true };
}

/**
 * Publish results — now calls the RECRUITMENT RPC. The action receives
 * recruitment_id (the page passes it).
 */
export async function publishResults(
  _prev: ReviewResult,
  formData: FormData,
): Promise<ReviewResult> {
  const recruitmentId = formData.get("recruitmentId") as string;
  const clubSlug = formData.get("__club_slug") as string;
  if (!recruitmentId) return { error: "Missing recruitment id." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_recruitment_results", {
    recruitment_id_in: recruitmentId,
  });
  if (error) return { error: error.message };

  // 15a: Send result emails to all applicants. Failures don't roll back
  // the publish. We log them; the DB state is correct regardless.
  try {
    const emailReport = await sendApplicationResultEmails(recruitmentId);
    console.log(
      `publish_results emails: ${emailReport.succeeded}/${emailReport.attempted} sent; ${emailReport.failed} failed`,
    );
    if (emailReport.failures.length > 0) {
      console.error(
        "publish_results email failures:",
        JSON.stringify(emailReport.failures, null, 2),
      );
    }
  } catch (e) {
    // Defensive — sendApplicationResultEmails shouldn't throw, but if it does,
    // we don't want to fail the action.
    console.error("publish_results email batch threw:", e);
  }

  revalidatePath(`/admin/clubs/${clubSlug}/applications`);
  revalidatePath(`/admin/clubs/${clubSlug}`);
  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true };
}
