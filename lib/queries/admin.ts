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
  current_recruitment: {
    id: string;
    name: string | null;
    deadline: string | null;
    result_date: string | null;
    results_published_at: string | null;
  } | null;
  upcoming_events: number;
  pending_applications: number | null;
}

interface RecruitmentRow {
  id: string;
  name: string | null;
  deadline: string | null;
  result_date: string | null;
  results_published_at: string | null;
}

/**
 * Helper: pull the latest recruitment for a list of club ids in one query
 * instead of N+1.
 */
async function getCurrentRecruitments(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  clubIds: string[],
): Promise<Map<string, RecruitmentRow>> {
  if (clubIds.length === 0) return new Map();
  const { data } = await supabase
    .from("recruitments")
    .select("id, club_id, name, deadline, result_date, results_published_at, created_at")
    .in("club_id", clubIds)
    .order("created_at", { ascending: false });
  // first row per club_id wins because of the desc order
  const map = new Map<string, RecruitmentRow>();
  for (const r of (data ?? []) as Array<RecruitmentRow & { club_id: string }>) {
    if (!map.has(r.club_id)) {
      map.set(r.club_id, {
        id: r.id,
        name: r.name,
        deadline: r.deadline,
        result_date: r.result_date,
        results_published_at: r.results_published_at,
      });
    }
  }
  return map;
}

export async function getMyAdminClubs(): Promise<AdminClub[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

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
    const { data, error } = await supabase
      .from("clubs")
      .select(
        "id, slug, name, member_count, is_recruiting, category:categories(*)",
      )
      .order("name");
    if (error) throw error;
    rows = (data ?? []).map((c) => ({ tier: "lead" as AdminTier, club: c }));
  } else {
    const { data, error } = await supabase
      .from("club_admins")
      .select(
        "admin_role, club:clubs(id, slug, name, member_count, is_recruiting, category:categories(*))",
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

  const clubIds = rows.map((r) => r.club.id);
  const recruitments = await getCurrentRecruitments(supabase, clubIds);

  const enriched = await Promise.all(
    rows.map(async ({ tier, club }) => {
      const recruitment = recruitments.get(club.id) ?? null;
      const [{ count: evCount }, appsCount] = await Promise.all([
        supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("club_id", club.id)
          .gt("starts_at", new Date().toISOString()),
        tier === "editor"
          ? Promise.resolve({ count: null as number | null })
          : recruitment
            ? supabase
                .from("applications")
                .select("*", { count: "exact", head: true })
                .eq("recruitment_id", recruitment.id)
                .eq("status", "pending")
            : Promise.resolve({ count: 0 as number | null }),
      ]);

      return {
        id: club.id,
        slug: club.slug,
        name: club.name,
        tier,
        category: club.category ?? null,
        member_count: club.member_count,
        is_recruiting: club.is_recruiting,
        current_recruitment: recruitment,
        upcoming_events: evCount ?? 0,
        pending_applications: appsCount.count,
      } satisfies AdminClub;
    }),
  );

  return enriched;
}

export async function getEditableClub(
  slug: string,
): Promise<{
  club: Club;
  category: Category | null;
  tier: AdminTier;
  current_recruitment: RecruitmentRow | null;
} | null> {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isSuper = profile?.role === "super_admin";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = club;

  // Look up current recruitment
  const { data: rec } = await supabase
    .from("recruitments")
    .select("id, name, deadline, result_date, results_published_at")
    .eq("club_id", c.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (isSuper) {
    return {
      club: c as Club,
      category: c.category ?? null,
      tier: "lead",
      current_recruitment: (rec as RecruitmentRow) ?? null,
    };
  }

  const { data: adminRow } = await supabase
    .from("club_admins")
    .select("admin_role")
    .eq("club_id", c.id)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!adminRow) return null;

  return {
    club: c as Club,
    category: c.category ?? null,
    tier: adminRow.admin_role as AdminTier,
    current_recruitment: (rec as RecruitmentRow) ?? null,
  };
}

export async function getCategoriesList(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
