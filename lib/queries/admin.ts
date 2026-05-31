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

/**
 * Clubs the current user manages, with their tier on each + quick stats.
 *
 * Super_admin: returns ALL clubs as if 'lead' (super_admin can do anything,
 * so showing the dashboard scoped to "all clubs at lead tier" is correct).
 * Other users: scoped to their club_admins rows.
 */
export async function getMyAdminClubs(): Promise<AdminClub[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Determine global role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isSuper = profile?.role === "super_admin";

  type Row = {
    tier: AdminTier;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    club: any;
  };
  let rows: Row[] = [];

  if (isSuper) {
    // every club, treated as lead
    const { data, error } = await supabase
      .from("clubs")
      .select(
        "id, slug, name, member_count, is_recruiting, recruitment_deadline, category:categories(*)",
      )
      .order("name");
    if (error) throw error;
    rows = (data ?? []).map((c) => ({ tier: "lead" as AdminTier, club: c }));
  } else {
    const { data, error } = await supabase
      .from("club_admins")
      .select(
        "admin_role, club:clubs(id, slug, name, member_count, is_recruiting, recruitment_deadline, category:categories(*))",
      )
      .eq("profile_id", user.id);
    if (error) throw error;
    rows = (data ?? [])
      .map((r) => ({
        tier: r.admin_role as AdminTier,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        club: (r as any).club,
      }))
      .filter((r) => r.club);
  }

  const enriched = await Promise.all(
    rows.map(async ({ tier, club }) => {
      const [{ count: evCount }, appsCount] = await Promise.all([
        supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("club_id", club.id)
          .gt("starts_at", new Date().toISOString()),
        // editors can't read applications via RLS; skip the count
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

  return enriched;
}

/**
 * A club + its category for the edit page. Verifies the user can edit it.
 * Super_admin can edit any club (returned tier='lead').
 */
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

  // Super_admin? full access
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role === "super_admin") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = club;
    return { club: c as Club, category: c.category ?? null, tier: "lead" };
  }

  // Otherwise must be in club_admins for this club
  const { data: adminRow } = await supabase
    .from("club_admins")
    .select("admin_role")
    .eq("club_id", club.id)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!adminRow) return null;

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
