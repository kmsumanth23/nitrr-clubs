import { createClient } from "@/lib/supabase/server";
import type { Faq } from "@/lib/database.types";

/** All FAQs, including unpublished, sorted by sort_order asc.
 *  Sysadmin-only; relies on the RLS policy added in 09i. */
export async function getFaqsForAdmin(): Promise<Faq[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return [];
  return data ?? [];
}

/** Two FAQs in sort order — used to figure out which to swap with. */
export async function getNeighborFaq(
  currentId: string,
  direction: "up" | "down",
): Promise<{ id: string; sort_order: number } | null> {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("faqs")
    .select("sort_order")
    .eq("id", currentId)
    .maybeSingle();
  if (!current) return null;

  let query = supabase
    .from("faqs")
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
