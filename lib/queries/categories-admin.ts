import { createClient } from "@/lib/supabase/server";

export interface CategoryWithUsage {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  club_count: number;
}

/** All categories with a count of active clubs using each. */
export async function getCategoriesForAdmin(): Promise<CategoryWithUsage[]> {
  const supabase = await createClient();

  const { data: cats, error } = await supabase
    .from("categories")
    .select("id, slug, name, sort_order")
    .order("sort_order", { ascending: true });
  if (error || !cats) return [];

  if (cats.length === 0) return [];

  // Fetch active clubs grouped by category in one round trip
  const { data: clubs } = await supabase
    .from("clubs")
    .select("category_id")
    .is("archived_at", null);

  const countByCategory = new Map<string, number>();
  for (const c of clubs ?? []) {
    if (!c.category_id) continue;
    countByCategory.set(
      c.category_id,
      (countByCategory.get(c.category_id) ?? 0) + 1,
    );
  }

  return cats.map((c) => ({
    ...c,
    club_count: countByCategory.get(c.id) ?? 0,
  }));
}

/** Neighbor lookup for reorder (same pattern as FAQ). */
export async function getNeighborCategory(
  currentId: string,
  direction: "up" | "down",
): Promise<{ id: string; sort_order: number } | null> {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("id", currentId)
    .maybeSingle();
  if (!current) return null;

  let query = supabase
    .from("categories")
    .select("id, sort_order")
    .neq("id", currentId);

  if (direction === "up") {
    query = query
      .lt("sort_order", current.sort_order)
      .order("sort_order", { ascending: false });
  } else {
    query = query
      .gt("sort_order", current.sort_order)
      .order("sort_order", { ascending: true });
  }

  const { data } = await query.limit(1).maybeSingle();
  return data ?? null;
}
