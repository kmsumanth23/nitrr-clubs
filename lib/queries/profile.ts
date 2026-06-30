import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  Application,
  Club,
  Category,
} from "@/lib/database.types";

export interface MyApplication extends Application {
  recruitment: {
    id: string;
    name: string | null;
    deadline: string | null;
    result_date: string | null;
    results_published_at: string | null;
  } | null;
  club: (Pick<Club, "name" | "slug"> & { category: Category | null }) | null;
}

export interface MyMembership {
  club_id: string;
  joined_at: string;
  club:
    | (Pick<Club, "name" | "slug" | "archived_at"> & {
        category: Category | null;
      })
    | null;
}

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

/**
 * All of the current user's applications, joined through recruitment +
 * club for display. Returned as one list; the UI partitions into Active /
 * History via {@link partitionApplications} so the rule stays in one place.
 */
export async function getMyApplications(): Promise<MyApplication[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("applications")
    .select(
      `*,
       recruitment:recruitments(id, name, deadline, result_date, results_published_at, club:clubs(name, slug, category:categories(*)))`,
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as Array<
    Application & {
      recruitment: {
        id: string;
        name: string | null;
        deadline: string | null;
        result_date: string | null;
        results_published_at: string | null;
        club: { name: string; slug: string; archived_at: string | null; category: Category | null } | null;
      } | null;
    }
  >).map((a) => ({
    ...a,
    recruitment: a.recruitment
      ? {
          id: a.recruitment.id,
          name: a.recruitment.name,
          deadline: a.recruitment.deadline,
          result_date: a.recruitment.result_date,
          results_published_at: a.recruitment.results_published_at,
        }
      : null,
    club: a.recruitment?.club ?? null,
  }));
}

/**
 * Partition applications into Active and History.
 *
 * Active = recruitment unpublished AND status in (pending, reviewing,
 * accepted, rejected). Anything else (published, withdrawn, removed,
 * orphaned) → History.
 *
 * Keeping this rule here means /profile UI just renders two lists without
 * re-deciding the rule.
 */
export function partitionApplications(apps: MyApplication[]): {
  active: MyApplication[];
  history: MyApplication[];
} {
  const active: MyApplication[] = [];
  const history: MyApplication[] = [];
  for (const a of apps) {
    const published = !!a.recruitment?.results_published_at;
    const statusActive =
      a.status === "pending" ||
      a.status === "reviewing" ||
      a.status === "accepted" ||
      a.status === "rejected";
    if (!published && statusActive) active.push(a);
    else history.push(a);
  }
  return { active, history };
}

export interface MyProfileClub {
  club_id: string;
  slug: string;
  name: string;
  category: Category | null;
  archived_at: string | null;
  role: "lead" | "manager" | "editor" | "member";
  /** For members: when they joined.
   *  For admins-only: null (no joined_at; show role tag without date). */
  joined_at: string | null;
}

/** Unified list of clubs to show in /profile My Clubs.
 *
 *  Includes:
 *  - Clubs where user is an admin (any tier) — tagged with their role
 *  - Clubs where user is a member (via club_members) — tagged "member"
 *
 *  When user is BOTH admin and member of the same club, admin wins
 *  (role tier shown, not "member"). Sorted: active first, then archived;
 *  within each, by name. */
export async function getMyProfileClubs(): Promise<MyProfileClub[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch admin clubs and member clubs in parallel
  const [adminRes, memberRes] = await Promise.all([
    supabase
      .from("club_admins")
      .select(
        "admin_role, club:clubs(id, slug, name, archived_at, category:categories(*))",
      )
      .eq("profile_id", user.id),
    supabase
      .from("club_members")
      .select(
        "joined_at, club:clubs(id, slug, name, archived_at, category:categories(*))",
      )
      .eq("profile_id", user.id),
  ]);

  const byClubId = new Map<string, MyProfileClub>();

  // Admin clubs first (so they take precedence on dedup)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (adminRes.data ?? []) as any[]) {
    if (!r.club) continue;
    byClubId.set(r.club.id, {
      club_id: r.club.id,
      slug: r.club.slug,
      name: r.club.name,
      category: r.club.category ?? null,
      archived_at: r.club.archived_at ?? null,
      role: r.admin_role,
      joined_at: null,
    });
  }

  // Members — only add if not already present from admin side
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (memberRes.data ?? []) as any[]) {
    if (!r.club) continue;
    if (byClubId.has(r.club.id)) {
      // Already added as admin — fill in joined_at if missing, keep admin role
      const existing = byClubId.get(r.club.id)!;
      if (!existing.joined_at) existing.joined_at = r.joined_at;
      continue;
    }
    byClubId.set(r.club.id, {
      club_id: r.club.id,
      slug: r.club.slug,
      name: r.club.name,
      category: r.club.category ?? null,
      archived_at: r.club.archived_at ?? null,
      role: "member",
      joined_at: r.joined_at,
    });
  }

  // Sort: active first, then archived. Within each, by name.
  return [...byClubId.values()].sort((a, b) => {
    const aArch = a.archived_at ? 1 : 0;
    const bArch = b.archived_at ? 1 : 0;
    if (aArch !== bArch) return aArch - bArch;
    return a.name.localeCompare(b.name);
  });
}

/** @deprecated since 14f — use {@link getMyProfileClubs} for the unified
 *  admin+member view. Retained for any external/future consumer. */
export async function getMyMemberships(): Promise<MyMembership[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("club_members")
    .select("club_id, joined_at, club:clubs(name, slug, archived_at, category:categories(*))")
    .eq("profile_id", user.id)
    .order("joined_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MyMembership[];
}
