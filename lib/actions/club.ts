"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export type ClubEditResult = { error?: string; ok?: boolean };

/** Update CONTENT-LEVEL club fields. No recruitment lifecycle state here. */
const clubContentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(120),
  tagline: z.string().max(160).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  highlights: z.array(z.string()).max(8),
  member_count: z.coerce.number().int().min(0).max(100000),
  community_whatsapp_link: z.string().max(500).nullable().optional(),
  instagram_url: z.string().max(500).nullable().optional(),
  linkedin_url: z.string().max(500).nullable().optional(),
});

export async function updateClubContent(
  _prev: ClubEditResult,
  formData: FormData,
): Promise<ClubEditResult> {
  // Highlights come in as multiple form entries
  const highlights = formData
    .getAll("highlights")
    .map((v) => String(v).trim())
    .filter((s) => s.length > 0)
    .slice(0, 8);

  const parsed = clubContentSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    tagline: nullable(formData.get("tagline")),
    category_id: nullable(formData.get("category_id")),
    description: nullable(formData.get("description")),
    highlights,
    member_count: formData.get("member_count") ?? 0,
    community_whatsapp_link: nullable(formData.get("community_whatsapp_link")),
    instagram_url: nullable(formData.get("instagram_url")),
    linkedin_url: nullable(formData.get("linkedin_url")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { id, ...rest } = parsed.data;
  const { error: clubErr, data: clubData } = await supabase
    .from("clubs")
    .update({
      ...rest,
      tagline: rest.tagline ?? null,
      category_id: rest.category_id ?? null,
      description: rest.description ?? null,
      community_whatsapp_link: rest.community_whatsapp_link ?? null,
      instagram_url: rest.instagram_url ?? null,
      linkedin_url: rest.linkedin_url ?? null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("slug")
    .single();
  if (clubErr) return { error: clubErr.message };

  if (clubData?.slug) {
    revalidatePath(`/clubs/${clubData.slug}`);
    revalidatePath(`/admin/clubs/${clubData.slug}`);
  }
  revalidatePath("/clubs");
  revalidatePath("/");
  return { ok: true };
}

/** Update RECRUITMENT LIFECYCLE state. Touches the most-recent
 *  recruitments row + clubs.is_recruiting. Refuses if the current
 *  recruitment is already published (start a new one instead). */
const recruitmentUpdateSchema = z.object({
  clubId: z.string().uuid(),
  is_recruiting: z.coerce.boolean(),
  recruitment_deadline: z.string().nullable().optional(),
  result_date: z.string().nullable().optional(),
});

export async function updateRecruitment(
  _prev: ClubEditResult,
  formData: FormData,
): Promise<ClubEditResult> {
  const parsed = recruitmentUpdateSchema.safeParse({
    clubId: formData.get("clubId"),
    is_recruiting:
      formData.get("is_recruiting") === "true" ||
      formData.get("is_recruiting") === "on",
    recruitment_deadline: nullable(formData.get("recruitment_deadline")),
    result_date: nullable(formData.get("result_date")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // is_recruiting on clubs
  const { error: clubErr, data: clubData } = await supabase
    .from("clubs")
    .update({
      is_recruiting: parsed.data.is_recruiting,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.clubId)
    .select("slug")
    .single();
  if (clubErr) return { error: clubErr.message };

  // Find current (most-recent published) recruitment, if any. 16A: skip
  // drafts — this legacy action doesn't manage draft state; the new drive
  // editor uses update_drive RPC instead.
  const { data: recRow } = await supabase
    .from("recruitments")
    .select("id, results_published_at")
    .eq("club_id", parsed.data.clubId)
    .not("published_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recRow && !recRow.results_published_at) {
    const deadlineIso = parsed.data.recruitment_deadline
      ? new Date(parsed.data.recruitment_deadline).toISOString()
      : null;
    const resultIso = parsed.data.result_date
      ? new Date(parsed.data.result_date).toISOString()
      : null;
    const { error: recErr } = await supabase
      .from("recruitments")
      .update({
        deadline: deadlineIso,
        result_date: resultIso,
      })
      .eq("id", recRow.id);
    if (recErr) return { error: recErr.message };
  }
  // If no recruitment exists, deadline/result fields silently no-op — the
  // page UI hides them in that state so this branch shouldn't fire.

  if (clubData?.slug) {
    revalidatePath(`/clubs/${clubData.slug}`);
    revalidatePath(`/admin/clubs/${clubData.slug}/recruitment`);
    revalidatePath(`/admin/clubs/${clubData.slug}`);
  }
  revalidatePath("/clubs");
  revalidatePath("/");
  return { ok: true };
}

/** Back-compat shim: existing code that still imports `updateClub` calls
 *  the new content action. Drop this once consumers migrate. */
export const updateClub = updateClubContent;

function nullable(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "") as string;
  return s.trim().length === 0 ? null : s;
}
