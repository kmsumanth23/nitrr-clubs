"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clubEditSchema } from "@/lib/validation/club";

export type ClubEditResult = { error?: string; ok?: boolean };

/** Update club content + recruitment/result dates. Stamps updated_by. */
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
    deadlineRaw && deadlineRaw.length > 0
      ? new Date(deadlineRaw).toISOString()
      : null;

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
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // sanity: result_date should be at/after deadline if both set
  if (parsed.data.recruitment_deadline && parsed.data.result_date) {
    if (
      new Date(parsed.data.result_date) <
      new Date(parsed.data.recruitment_deadline)
    ) {
      return { error: "Result date cannot be before the deadline." };
    }
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
