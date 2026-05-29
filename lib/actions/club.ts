"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clubEditSchema } from "@/lib/validation/club";

export type ClubEditResult = { error?: string; ok?: boolean };

/**
 * Update club content. Anyone with a row in club_admins for this club
 * (editor+) can edit content — RLS enforces it. Stamps updated_by for audit.
 */
export async function updateClub(
  _prev: ClubEditResult,
  formData: FormData,
): Promise<ClubEditResult> {
  // collect highlight fields (highlights__0, highlights__1, ...)
  const highlights: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("highlights__") && typeof value === "string" && value.trim()) {
      highlights.push(value.trim());
    }
  }

  const deadlineRaw = formData.get("recruitment_deadline") as string | null;
  // datetime-local gives "YYYY-MM-DDTHH:mm" with no zone; treat as local time
  const deadlineIso =
    deadlineRaw && deadlineRaw.length > 0
      ? new Date(deadlineRaw).toISOString()
      : null;

  const parsed = clubEditSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    tagline: nullable(formData.get("tagline")),
    description: nullable(formData.get("description")),
    category_id: nullable(formData.get("category_id")),
    highlights,
    is_recruiting: formData.get("is_recruiting") === "on",
    recruitment_deadline: deadlineIso,
    member_count: formData.get("member_count"),
    instagram_url: nullable(formData.get("instagram_url")),
    linkedin_url: nullable(formData.get("linkedin_url")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { id, ...patch } = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };

  const { error } = await supabase
    .from("clubs")
    .update({ ...patch, updated_by: user.id })
    .eq("id", id);
  if (error) return { error: error.message };

  // bust ISR caches for the public pages this club appears on
  revalidatePath("/");
  revalidatePath("/clubs");
  // (slug may have changed in theory, but our schema makes slug immutable here)
  revalidatePath(`/clubs/${parsed.data.name.toLowerCase().replace(/\s+/g, "-")}`);

  return { ok: true };
}

function nullable(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "") as string;
  return s.trim().length === 0 ? null : s;
}
