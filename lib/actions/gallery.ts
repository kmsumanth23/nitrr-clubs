"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  captionSchema,
  reorderSchema,
  homepageToggleSchema,
  deleteSchema,
  createPhotoSchema,
} from "@/lib/validation/gallery";
import { deleteFile, pathFromUrl } from "@/lib/storage/gallery";

export type GalleryResult = { error?: string; ok?: boolean; id?: string };

/** Called by the client AFTER the file has uploaded to Storage successfully.
 *  Inserts the row pointing at the uploaded file. Keeps the upload itself
 *  on the client (where we resize first) and the DB write atomic on the
 *  server. */
export async function createPhotoRow(
  _prev: GalleryResult,
  formData: FormData,
): Promise<GalleryResult> {
  const parsed = createPhotoSchema.safeParse({
    clubId: formData.get("clubId"),
    clubSlug: formData.get("clubSlug"),
    path: formData.get("path"),
    imageUrl: formData.get("imageUrl"),
    caption: nullable(formData.get("caption")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  // Compute next sort_order: max + 1
  const { data: existing } = await supabase
    .from("gallery_photos")
    .select("sort_order")
    .eq("club_id", parsed.data.clubId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (existing?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("gallery_photos")
    .insert({
      club_id: parsed.data.clubId,
      image_url: parsed.data.imageUrl,
      caption: parsed.data.caption ?? null,
      sort_order: nextSortOrder,
      show_on_homepage: true,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath(`/admin/clubs/${parsed.data.clubSlug}/gallery`);
  revalidatePath(`/clubs/${parsed.data.clubSlug}`);
  revalidatePath("/gallery");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function updateCaption(
  _prev: GalleryResult,
  formData: FormData,
): Promise<GalleryResult> {
  const clubSlug = formData.get("__club_slug") as string;
  const parsed = captionSchema.safeParse({
    photoId: formData.get("photoId"),
    caption: nullable(formData.get("caption")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("gallery_photos")
    .update({ caption: parsed.data.caption ?? null })
    .eq("id", parsed.data.photoId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/clubs/${clubSlug}/gallery`);
  revalidatePath(`/clubs/${clubSlug}`);
  return { ok: true };
}

/** Reorder a single photo by one position. Swaps sort_order with the
 *  immediate neighbor in the requested direction. */
export async function reorderPhoto(
  _prev: GalleryResult,
  formData: FormData,
): Promise<GalleryResult> {
  const clubSlug = formData.get("__club_slug") as string;
  const parsed = reorderSchema.safeParse({
    photoId: formData.get("photoId"),
    direction: formData.get("direction"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  const { data: me } = await supabase
    .from("gallery_photos")
    .select("id, club_id, sort_order")
    .eq("id", parsed.data.photoId)
    .maybeSingle();
  if (!me) return { error: "Photo not found." };

  // Neighbor query: in 'up' direction we want the photo immediately before
  // (smaller sort_order, largest among those). In 'down' direction, the
  // photo immediately after.
  const neighborQuery = supabase
    .from("gallery_photos")
    .select("id, sort_order")
    .eq("club_id", me.club_id);

  const { data: neighbor } =
    parsed.data.direction === "up"
      ? await neighborQuery
          .lt("sort_order", me.sort_order)
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle()
      : await neighborQuery
          .gt("sort_order", me.sort_order)
          .order("sort_order", { ascending: true })
          .limit(1)
          .maybeSingle();

  if (!neighbor) return { ok: true }; // already at the edge; no-op

  // Swap sort_orders. Two updates; not strictly atomic but conflicts are
  // benign (worst case is a momentary equal sort_order).
  const { error: e1 } = await supabase
    .from("gallery_photos")
    .update({ sort_order: neighbor.sort_order })
    .eq("id", me.id);
  if (e1) return { error: e1.message };
  const { error: e2 } = await supabase
    .from("gallery_photos")
    .update({ sort_order: me.sort_order })
    .eq("id", neighbor.id);
  if (e2) return { error: e2.message };

  revalidatePath(`/admin/clubs/${clubSlug}/gallery`);
  revalidatePath(`/clubs/${clubSlug}`);
  return { ok: true };
}

export async function toggleHomepage(
  _prev: GalleryResult,
  formData: FormData,
): Promise<GalleryResult> {
  const clubSlug = formData.get("__club_slug") as string;
  const parsed = homepageToggleSchema.safeParse({
    photoId: formData.get("photoId"),
    show: formData.get("show") === "true" || formData.get("show") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("gallery_photos")
    .update({ show_on_homepage: parsed.data.show })
    .eq("id", parsed.data.photoId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/clubs/${clubSlug}/gallery`);
  revalidatePath("/gallery");
  revalidatePath("/");
  return { ok: true };
}

/** Delete N photos. For each: Storage delete first; if it succeeds, delete
 *  the DB row. If Storage fails, the row is left in place — the user can
 *  retry. */
export async function deletePhotos(
  _prev: GalleryResult,
  formData: FormData,
): Promise<GalleryResult> {
  const clubSlug = formData.get("__club_slug") as string;
  const idsRaw = formData.get("photoIds") as string;
  const ids = idsRaw ? idsRaw.split(",").filter(Boolean) : [];
  const parsed = deleteSchema.safeParse({ photoIds: ids });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: photos, error: fetchErr } = await supabase
    .from("gallery_photos")
    .select("id, image_url")
    .in("id", parsed.data.photoIds);
  if (fetchErr) return { error: fetchErr.message };

  const failures: string[] = [];
  for (const p of photos ?? []) {
    const path = pathFromUrl(p.image_url);
    if (path) {
      const res = await deleteFile(supabase, path);
      if (!res.ok) {
        failures.push(p.id);
        continue;
      }
    }
    const { error: delErr } = await supabase
      .from("gallery_photos")
      .delete()
      .eq("id", p.id);
    if (delErr) failures.push(p.id);
  }

  revalidatePath(`/admin/clubs/${clubSlug}/gallery`);
  revalidatePath(`/clubs/${clubSlug}`);
  revalidatePath("/gallery");
  revalidatePath("/");
  if (failures.length > 0) {
    return { error: `${failures.length} photo(s) could not be deleted. Try again.` };
  }
  return { ok: true };
}

function nullable(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "") as string;
  return s.trim().length === 0 ? null : s;
}
