import { createClient } from "@/lib/supabase/server";
import type { Club, Category, EventRow, Faq } from "@/lib/database.types";

export type ClubWithCategory = Club & { category: Category | null };

/** Popular ACTIVE clubs for the landing grid. */
export async function getPopularClubs(limit = 6): Promise<ClubWithCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("*, category:categories(*)")
    .is("archived_at", null)
    .order("member_count", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ClubWithCategory[];
}

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

export async function getGalleryImages(limit = 16): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("image_url")
    .eq("show_on_homepage", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => r.image_url);
}

export interface SiteStats {
  clubs: number;
  members: number;
  events: number;
  categories: number;
}

export async function getSiteStats(): Promise<SiteStats> {
  const supabase = await createClient();

  const [clubsRes, eventsRes, catsRes, membersRes] = await Promise.all([
    supabase
      .from("clubs")
      .select("*", { count: "exact", head: true })
      .is("archived_at", null),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("categories").select("*", { count: "exact", head: true }),
    supabase
      .from("clubs")
      .select("member_count")
      .is("archived_at", null),
  ]);

  const members = (membersRes.data ?? []).reduce(
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
