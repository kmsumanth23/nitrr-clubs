import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/database.types";

/** All events for one club, server-fetched. Used on the admin events list. */
export async function getEventsForClub(clubId: string): Promise<EventRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("club_id", clubId)
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

/** One event by id, scoped to a club (so a wrong-club id can't be loaded). */
export async function getEventByIdForClub(
  id: string,
  clubId: string,
): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("club_id", clubId)
    .maybeSingle();
  if (error) throw error;
  return (data as EventRow) ?? null;
}
