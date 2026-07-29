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

function nullable(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "") as string;
  return s.trim().length === 0 ? null : s;
}
