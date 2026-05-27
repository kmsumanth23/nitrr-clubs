import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/supabase__static";
import type { EventRow, Club, Category } from "@/lib/database.types";

export type EventWithClub = EventRow & {
  club: (Pick<Club, "name" | "slug"> & { category: Category | null }) | null;
};

/** All events with their host club + category. Upcoming first. */
export async function getAllEvents(): Promise<EventWithClub[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*, club:clubs(name, slug, category:categories(*))")
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventWithClub[];
}

/** One event by slug, with host club. */
export async function getEventBySlug(
  slug: string,
): Promise<EventWithClub | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*, club:clubs(name, slug, category:categories(*))")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as EventWithClub) ?? null;
}

/** All event slugs — for generateStaticParams. */
export async function getAllEventSlugs(): Promise<string[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase.from("events").select("slug");
  if (error) throw error;
  return (data ?? []).map((e) => e.slug);
}
