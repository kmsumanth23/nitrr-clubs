import { createClient } from "@/lib/supabase/server";

export interface ClubFilterOption {
  id: string;
  slug: string;
  name: string;
}

/** Lightweight list of clubs for filter dropdowns. Includes archived for
 *  sysadmin (so they can audit decommissioned clubs); excludes for others. */
export async function getClubsForFilter(
  includeArchived = false,
): Promise<ClubFilterOption[]> {
  const supabase = await createClient();
  let q = supabase.from("clubs").select("id, slug, name").order("name");
  if (!includeArchived) q = q.is("archived_at", null);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as ClubFilterOption[];
}
