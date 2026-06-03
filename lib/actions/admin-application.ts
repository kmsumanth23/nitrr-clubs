"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPhase } from "@/lib/phase";
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

/**
 * Set an application's status. Phase-aware:
 *  - open: only pending/reviewing allowed (no decisions); the trigger also
 *    catches this, but the action gives a friendlier error.
 *  - review: free movement between pending/reviewing/accepted/rejected.
 *  - result: locked (super_admin bypass at the DB layer).
 *
 * Critical change from original 9d: this no longer inserts into club_members
 * on accept. Membership is materialized only at publish time.
 */
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
      "club_id, status, club:clubs(recruitment_deadline, result_date, results_published_at)",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (!app) return { error: "Application not found." };

  const auth = await ensureCanManageApplications(app.club_id);
  if (!auth.ok) return { error: auth.error };

  if (app.status === "withdrawn") {
    return { error: "This application was withdrawn by the student." };
  }
  if (app.status === "removed") {
    return { error: "This member was removed; status cannot change here." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const club: any = app.club;
  const phase = getPhase(club);
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

/** Save an internal note on an application. Stamps note_by + note_at. */
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
 * Publish results — lead-only (enforced in the SQL RPC). Calls the
 * publish_club_results function which gates on no pending/reviewing left
 * and materializes club_members rows for accepted apps.
 */
export async function publishResults(
  _prev: ReviewResult,
  formData: FormData,
): Promise<ReviewResult> {
  const clubId = formData.get("clubId") as string;
  const clubSlug = formData.get("__club_slug") as string;
  if (!clubId) return { error: "Missing club id." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_club_results", {
    club_id_in: clubId,
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/clubs/${clubSlug}/applications`);
  revalidatePath(`/admin/clubs/${clubSlug}`);
  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true };
}
