import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "club-gallery";

/** Build a path like `<club_slug>/<timestamp>-<random>.<ext>`. The first
 *  segment (slug) is what the Storage RLS policy checks for authority. */
export function buildPath(clubSlug: string, originalFilename: string): string {
  const ext = filenameExt(originalFilename);
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  return `${clubSlug}/${stamp}-${rand}.${ext}`;
}

export function filenameExt(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return "jpg";
  return name.slice(dot + 1).toLowerCase();
}

/** Public URL for a stored object. The bucket is public, so this returns
 *  a permanent CDN-cached URL. */
export function publicUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  path: string,
): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Extract the storage path from a public URL stored in image_url. The
 *  public URL looks like:
 *    https://<project>.supabase.co/storage/v1/object/public/club-gallery/<path>
 *  We slice everything after the bucket name. */
export function pathFromUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  return url.slice(idx + marker.length);
}

/** Upload a single file. Returns the storage path on success. */
export async function uploadFile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  path: string,
  file: Blob,
  contentType = "image/jpeg",
): Promise<{ path?: string; error?: string }> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType, upsert: false });
  if (error) return { error: error.message };
  return { path };
}

/** Delete a single file. Returns true on success. */
export async function deleteFile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  path: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
