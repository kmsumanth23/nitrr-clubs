import { createClient } from "@/lib/supabase/server";
import type { GalleryPhoto, Club } from "@/lib/database.types";

export type GalleryItem = GalleryPhoto & {
  club: Pick<Club, "name" | "slug"> | null;
};

/** All gallery photos with their club, newest first. */
export async function getAllGalleryPhotos(): Promise<GalleryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("*, club:clubs(name, slug)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GalleryItem[];
}
