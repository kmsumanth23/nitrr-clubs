import { createClient } from "@/lib/supabase/supabase__server";
import type { Club, Category, EventRow, Faq } from "@/lib/database.types";

export type ClubWithCategory = Club & { category: Category | null };

/** Popular clubs for the landing grid (subset). Highest member_count first. */
export async function getPopularClubs(limit = 6): Promise<ClubWithCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("*, category:categories(*)")
    .order("member_count", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ClubWithCategory[];
}

/** Upcoming events (soonest first), for the fanned poster section. */
export async function getUpcomingEvents(limit = 5): Promise<EventRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Published FAQs in order. */
export async function getFaqs(): Promise<Faq[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Gallery image URLs for the marquee. */
export async function getGalleryImages(limit = 16): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("*")
    .order("sort_order", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as { image_url: string }[]).map((r) => r.image_url);
}

export interface SiteStats {
  clubs: number;
  members: number;
  events: number;
  categories: number;
}

/**
 * Live counts for the stats capsule. `head: true` + `count: "exact"` returns
 * only the count, not rows — cheap. members = sum of member_count.
 */
export async function getSiteStats(): Promise<SiteStats> {
  const supabase = await createClient();

  const [clubsRes, eventsRes, catsRes, membersRes] = await Promise.all([
    supabase.from("clubs").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("categories").select("*", { count: "exact", head: true }),
    supabase.from("clubs").select("member_count"),
  ]);

  const members = ((membersRes.data ?? []) as { member_count: number | null }[]).reduce(
    (sum, c) => sum + (c.member_count ?? 0),
    0,
  );

  return {
    clubs: clubsRes.count ?? 0,
    members,
    events: eventsRes.count ?? 0,
    categories: catsRes.count ?? 0,
  };
}
