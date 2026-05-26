import { createClient } from "@/lib/supabase/supabase__server";
import { createStaticClient } from "@/lib/supabase/supabase__static";
import type {
  Club,
  Category,
  ClubTeam,
  EventRow,
  GalleryPhoto,
} from "@/lib/database.types";

export type ClubWithCategory = Club & { category: Category | null };

/** All clubs + their category, for the listing page. */
export async function getAllClubs(): Promise<ClubWithCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("*, category:categories(*)")
    .order("member_count", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClubWithCategory[];
}

/** All categories, for the filter pills. */
export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface ClubDetail extends ClubWithCategory {
  team: ClubTeam[];
  events: EventRow[];
  gallery: GalleryPhoto[];
}

/** One club by slug, with category, team, its events and gallery. */
export async function getClubBySlug(slug: string): Promise<ClubDetail | null> {
  const supabase = await createClient();

  const { data: club, error } = await supabase
    .from("clubs")
    .select("*, category:categories(*)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!club) return null;

  const clubId = (club as ClubWithCategory).id;

  const [teamRes, eventsRes, galleryRes] = await Promise.all([
    supabase
      .from("club_team")
      .select("*")
      .eq("club_id", clubId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("events")
      .select("*")
      .eq("club_id", clubId)
      .order("starts_at", { ascending: true }),
    supabase
      .from("gallery_photos")
      .select("*")
      .eq("club_id", clubId)
      .order("sort_order", { ascending: true }),
  ]);

  return {
    ...(club as ClubWithCategory),
    team: teamRes.data ?? [],
    events: eventsRes.data ?? [],
    gallery: galleryRes.data ?? [],
  };
}

/** All slugs — for generateStaticParams (pre-render every club page). */
export async function getAllClubSlugs(): Promise<string[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase.from("clubs").select("slug");
  if (error) throw error;
  return (data ?? []).map((c) => c.slug);
}
