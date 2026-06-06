"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clubEditSchema } from "@/lib/validation/club";

export type ClubEditResult = { error?: string; ok?: boolean };

/**
 * Update club content. Writes deadline + result_date to the current
 * recruitment (only when not published); other fields go to clubs. Adds
 * community_whatsapp_link to the clubs row.
 */
export async function updateClub(
  _prev: ClubEditResult,
  formData: FormData,
): Promise<ClubEditResult> {
  const highlights: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("highlights__") && typeof value === "string" && value.trim()) {
      highlights.push(value.trim());
    }
  }

  const deadlineRaw = formData.get("recruitment_deadline") as string | null;
  const deadlineIso =
    deadlineRaw && deadlineRaw.length > 0 ? new Date(deadlineRaw).toISOString() : null;
  const resultRaw = formData.get("result_date") as string | null;
  const resultIso =
    resultRaw && resultRaw.length > 0 ? new Date(resultRaw).toISOString() : null;

  const parsed = clubEditSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    tagline: nullable(formData.get("tagline")),
    description: nullable(formData.get("description")),
    category_id: nullable(formData.get("category_id")),
    highlights,
    is_recruiting: formData.get("is_recruiting") === "on",
    recruitment_deadline: deadlineIso,
    result_date: resultIso,
    member_count: formData.get("member_count"),
    instagram_url: nullable(formData.get("instagram_url")),
    linkedin_url: nullable(formData.get("linkedin_url")),
    community_whatsapp_link: nullable(formData.get("community_whatsapp_link")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.recruitment_deadline && parsed.data.result_date) {
    if (
      new Date(parsed.data.result_date) < new Date(parsed.data.recruitment_deadline)
    ) {
      return { error: "Result date cannot be before the deadline." };
    }
  }

  const { id, recruitment_deadline, result_date, ...clubPatch } = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };

  // 1) Update the clubs row (includes community_whatsapp_link via clubPatch)
  const { error: clubErr } = await supabase
    .from("clubs")
    .update({ ...clubPatch, updated_by: user.id })
    .eq("id", id);
  if (clubErr) return { error: clubErr.message };

  // 2) Update the current recruitment row with deadline/result_date, but
  //    only if it's not already published (published recruitments are locked
  //    and a new one must be created via Start New Recruitment).
  const { data: currentRec } = await supabase
    .from("recruitments")
    .select("id, results_published_at")
    .eq("club_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (currentRec) {
    if (!currentRec.results_published_at) {
      const { error: recErr } = await supabase
        .from("recruitments")
        .update({
          deadline: recruitment_deadline ?? null,
          result_date: result_date ?? null,
        })
        .eq("id", currentRec.id);
      if (recErr) return { error: recErr.message };
    }
    // If the current recruitment is published, ignore the date fields here.
    // The form disables them visually in that state.
  } else if (recruitment_deadline || result_date) {
    const { error: insErr } = await supabase.from("recruitments").insert({
      club_id: id,
      name: "Initial recruitment",
      deadline: recruitment_deadline ?? null,
      result_date: result_date ?? null,
      created_by: user.id,
    });
    if (insErr) return { error: insErr.message };
  }

  revalidatePath("/");
  revalidatePath("/clubs");
  revalidatePath(`/clubs/${parsed.data.name.toLowerCase().replace(/\s+/g, "-")}`);
  revalidatePath("/profile");
  return { ok: true };
}

function nullable(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "") as string;
  return s.trim().length === 0 ? null : s;
}
