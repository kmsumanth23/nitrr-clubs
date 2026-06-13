import { createClient } from "@/lib/supabase/server";

export interface AdminGalleryPhoto {
  id: string;
  club_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  show_on_homepage: boolean;
  created_at: string;
}

/** All photos for a club, ordered by sort_order asc then created_at desc. */
export async function getGalleryForClub(
  clubId: string,
): Promise<AdminGalleryPhoto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, club_id, image_url, caption, sort_order, show_on_homepage, created_at")
    .eq("club_id", clubId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminGalleryPhoto[];
}
