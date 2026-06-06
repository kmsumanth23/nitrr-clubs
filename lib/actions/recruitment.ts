"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { newRecruitmentSchema } from "@/lib/validation/recruitment";

export type RecruitmentResult = { error?: string; ok?: boolean };

function nullable(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "") as string;
  return s.trim().length === 0 ? null : s;
}

function toIso(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "") as string;
  if (!s.trim()) return null;
  return new Date(s).toISOString();
}

export async function startNewRecruitment(
  _prev: RecruitmentResult,
  formData: FormData,
): Promise<RecruitmentResult> {
  const club_id = formData.get("club_id") as string;
  const clubSlug = formData.get("__club_slug") as string;

  const parsed = newRecruitmentSchema.safeParse({
    club_id,
    name: (formData.get("name") as string) ?? "",
    deadline: toIso(formData.get("deadline")),
    result_date: toIso(formData.get("result_date")),
    interview_mode: nullable(formData.get("interview_mode")) as
      | "online"
      | "offline"
      | "hybrid"
      | null,
    interview_whatsapp_link: nullable(formData.get("interview_whatsapp_link")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("start_new_recruitment", {
    club_id_in: parsed.data.club_id,
    name_in: parsed.data.name ?? null,
    deadline_in: parsed.data.deadline ?? null,
    result_date_in: parsed.data.result_date ?? null,
    interview_whatsapp_link_in: parsed.data.interview_whatsapp_link ?? null,
    interview_mode_in: parsed.data.interview_mode ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/clubs/${clubSlug}`);
  revalidatePath(`/admin/clubs/${clubSlug}/applications`);
  revalidatePath(`/clubs/${clubSlug}`);
  revalidatePath("/clubs");
  revalidatePath("/");
  return { ok: true };
}
