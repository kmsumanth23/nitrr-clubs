import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/supabase__static";
import type {
  Club,
  Category,
  ClubTeam,
  EventRow,
  GalleryPhoto,
} from "@/lib/database.types";

export type ClubWithCategory = Club & {
  category: Category | null;
  current_recruitment: {
    id: string;
    deadline: string | null;
    results_published_at: string | null;
  } | null;
};

/** All clubs + their category + current recruitment, for the listing page. */
export async function getAllClubs(): Promise<ClubWithCategory[]> {
  const supabase = await createClient();
  const { data: clubs, error } = await supabase
    .from("clubs")
    .select("*, category:categories(*)")
    .order("member_count", { ascending: false });
  if (error) throw error;
  if (!clubs || clubs.length === 0) return [];

  // attach the latest recruitment per club in one query (avoid N+1)
  const ids = clubs.map((c) => c.id);
  const { data: recs } = await supabase
    .from("recruitments")
    .select("id, club_id, deadline, results_published_at, created_at")
    .in("club_id", ids)
    .order("created_at", { ascending: false });

  const recMap = new Map<
    string,
    { id: string; deadline: string | null; results_published_at: string | null }
  >();
  for (const r of (recs ?? []) as Array<{
    id: string;
    club_id: string;
    deadline: string | null;
    results_published_at: string | null;
  }>) {
    if (!recMap.has(r.club_id)) {
      recMap.set(r.club_id, {
        id: r.id,
        deadline: r.deadline,
        results_published_at: r.results_published_at,
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return clubs.map((c: any) => ({
    ...c,
    current_recruitment: recMap.get(c.id) ?? null,
  })) as ClubWithCategory[];
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

/** One club by slug + category + team + events + gallery + current recruitment. */
export async function getClubBySlug(slug: string): Promise<ClubDetail | null> {
  const supabase = await createClient();

  const { data: club, error } = await supabase
    .from("clubs")
    .select("*, category:categories(*)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!club) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clubId = (club as any).id;

  const [teamRes, eventsRes, galleryRes, recRes] = await Promise.all([
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
    supabase
      .from("recruitments")
      .select("id, deadline, results_published_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = club;
  return {
    ...c,
    team: teamRes.data ?? [],
    events: eventsRes.data ?? [],
    gallery: galleryRes.data ?? [],
    current_recruitment: recRes.data
      ? {
          id: recRes.data.id,
          deadline: recRes.data.deadline,
          results_published_at: recRes.data.results_published_at,
        }
      : null,
  };
}

/** All slugs — for generateStaticParams. Uses the build-time client because
 *  this runs at build (no HTTP request, so no cookies). */
export async function getAllClubSlugs(): Promise<string[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase.from("clubs").select("slug");
  if (error) throw error;
  return (data ?? []).map((c) => c.slug);
}