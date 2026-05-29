import { createClient } from "@/lib/supabase/server";
import type {
  Club,
  Category,
  AdminTier,
} from "@/lib/database.types";

export interface AdminClub {
  id: string;
  slug: string;
  name: string;
  tier: AdminTier;
  category: Category | null;
  member_count: number | null;
  is_recruiting: boolean;
  recruitment_deadline: string | null;
  upcoming_events: number;
  pending_applications: number | null; // null for editors (can't see)
}

/** Clubs the current user manages, with their tier on each + quick stats. */
export async function getMyAdminClubs(): Promise<AdminClub[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows, error } = await supabase
    .from("club_admins")
    .select(
      "admin_role, club:clubs(id, slug, name, member_count, is_recruiting, recruitment_deadline, category:categories(*))",
    )
    .eq("profile_id", user.id);
  if (error) throw error;
  if (!rows) return [];

  // For each club, fetch quick stats in parallel.
  const enriched = await Promise.all(
    rows.map(async (row) => {
      // joined relation is named "club"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const club: any = row.club;
      if (!club) return null;

      const tier = row.admin_role as AdminTier;

      const [{ count: evCount }, appsCount] = await Promise.all([
        supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("club_id", club.id)
          .gt("starts_at", new Date().toISOString()),
        // editors can't read applications (RLS), so skip the count for them
        tier === "editor"
          ? Promise.resolve({ count: null as number | null })
          : supabase
              .from("applications")
              .select("*", { count: "exact", head: true })
              .eq("club_id", club.id)
              .eq("status", "pending"),
      ]);

      return {
        id: club.id,
        slug: club.slug,
        name: club.name,
        tier,
        category: club.category ?? null,
        member_count: club.member_count,
        is_recruiting: club.is_recruiting,
        recruitment_deadline: club.recruitment_deadline,
        upcoming_events: evCount ?? 0,
        pending_applications: appsCount.count,
      } satisfies AdminClub;
    }),
  );

  return enriched.filter(Boolean) as AdminClub[];
}

/** A club + its category for the edit page. Verifies the user can edit it. */
export async function getEditableClub(
  slug: string,
): Promise<{ club: Club; category: Category | null; tier: AdminTier } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: club } = await supabase
    .from("clubs")
    .select("*, category:categories(*)")
    .eq("slug", slug)
    .maybeSingle();
  if (!club) return null;

  const { data: adminRow } = await supabase
    .from("club_admins")
    .select("admin_role")
    .eq("club_id", club.id)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!adminRow) return null; // user isn't an admin of this club

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = club;
  return {
    club: c as Club,
    category: c.category ?? null,
    tier: adminRow.admin_role as AdminTier,
  };
}

/** All categories, ordered, for the edit form's category select. */
export async function getCategoriesList(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
