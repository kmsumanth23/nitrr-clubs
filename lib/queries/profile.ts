import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  Application,
  Club,
  Category,
} from "@/lib/database.types";
import type { DriveQuestion } from "@/lib/queries/admin-drives";

export interface MyApplication extends Application {
  recruitment: {
    id: string;
    name: string | null;
    deadline: string | null;
    result_date: string | null;
    results_published_at: string | null;
    target_years: number[]; // 16B
    published_at: string | null; // 16A
    interview_whatsapp_link: string | null; // 16C
    community_whatsapp_link: string | null; // 17A: drive-specific override
    questions: DriveQuestion[]; // 16B — sorted by sort_order
  } | null;
  club: (Pick<Club, "name" | "slug"> & { category: Category | null }) | null;
}

export interface MyMembership {
  club_id: string;
  joined_at: string;
  /** 17B: structural role (enum). */
  role: string;
  /** 17B: custom label snapshot; falls back to default label for the role. */
  role_label: string | null;
  /** 17B: UI-only flag — filtered out of the bulk-promote picker by default. */
  exclude_from_promote: boolean;
  /** 17B: when this member also holds a web-admin tier on the same club,
   *  render a second pill on their My Clubs card. Null when they're just a
   *  member. Values match `club_admins.admin_role` — `lead`/`manager`/`editor`. */
  admin_tier: string | null;
  club:
    | (Pick<
        Club,
        "id" | "name" | "slug" | "archived_at" | "community_whatsapp_link" | "instagram_url"
      > & {
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
       recruitment:recruitments(
         id, name, deadline, result_date, results_published_at, target_years, published_at,
         interview_whatsapp_link, community_whatsapp_link,
         club:clubs(name, slug, category:categories(*)),
         drive_questions(id, prompt, question_type, sort_order, required)
       )`,
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .order("sort_order", {
      referencedTable: "recruitments.drive_questions",
      ascending: true,
    });
  if (error) throw error;

  return ((data ?? []) as unknown as Array<
    Application & {
      recruitment: {
        id: string;
        name: string | null;
        deadline: string | null;
        result_date: string | null;
        results_published_at: string | null;
        target_years: number[];
        published_at: string | null;
        interview_whatsapp_link: string | null;
        community_whatsapp_link: string | null;
        club: { name: string; slug: string; archived_at: string | null; category: Category | null } | null;
        drive_questions: DriveQuestion[] | null;
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
          target_years: a.recruitment.target_years ?? [1, 2, 3, 4],
          published_at: a.recruitment.published_at,
          interview_whatsapp_link: a.recruitment.interview_whatsapp_link ?? null, // 16C
          community_whatsapp_link: a.recruitment.community_whatsapp_link ?? null, // 17A
          questions: a.recruitment.drive_questions ?? [],
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
  /** 16C: community WhatsApp link. Shown as a small button in the row when set. */
  community_whatsapp_link: string | null;
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
        "admin_role, club:clubs(id, slug, name, archived_at, community_whatsapp_link, category:categories(*))",
      )
      .eq("profile_id", user.id),
    supabase
      .from("club_members")
      .select(
        "joined_at, club:clubs(id, slug, name, archived_at, community_whatsapp_link, category:categories(*))",
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
      community_whatsapp_link: r.club.community_whatsapp_link ?? null, // 16C
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
      community_whatsapp_link: r.club.community_whatsapp_link ?? null, // 16C
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

/** 17A: un-deprecated. Powers the redesigned "My Clubs" card grid on
 *  /profile. Members-only view (users with a `club_members` row). Admin-only
 *  users see their clubs on /admin instead.
 *
 *  17B: replaces the 17A two-query drive-scoped community link resolver with a
 *  single embedded join on `source_recruitment_id`. Fallback chain per row:
 *    1. source_recruitment.community_whatsapp_link  (drive-specific)
 *    2. club.community_whatsapp_link                (club-level)
 *
 *  Also fetches `admin_tier` for the web-admin overlay pill via a second
 *  scoped query on `club_admins` (embedding it in the same select doesn't
 *  disambiguate cleanly since we're keying by profile_id, not FK). */
export async function getMyMemberships(): Promise<MyMembership[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("club_members")
    .select(
      `club_id, joined_at, role, role_label, exclude_from_promote,
       source_recruitment:recruitments!club_members_source_recruitment_id_fkey(community_whatsapp_link),
       club:clubs(id, name, slug, community_whatsapp_link, instagram_url, archived_at, category:categories(*))`,
    )
    .eq("profile_id", user.id)
    .order("joined_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<{
    club_id: string;
    joined_at: string;
    role: string | null;
    role_label: string | null;
    exclude_from_promote: boolean | null;
    source_recruitment: { community_whatsapp_link: string | null } | null;
    club: MyMembership["club"];
  }>;
  if (rows.length === 0) return [];

  // Second query: web-admin tiers for these clubs (if the viewer is also an
  // admin on them). Cheap — one round-trip, scoped to `profile_id = auth.uid()`.
  const clubIds = rows.map((r) => r.club_id);
  const adminTierByClub = new Map<string, string>();
  const { data: adminRows, error: adminErr } = await supabase
    .from("club_admins")
    .select("club_id, admin_role")
    .eq("profile_id", user.id)
    .in("club_id", clubIds);
  if (adminErr) {
    console.error("getMyMemberships admin_tier lookup failed:", adminErr);
    // Non-fatal: fall through with admin_tier = null.
  } else {
    for (const r of (adminRows ?? []) as Array<{
      club_id: string;
      admin_role: string;
    }>) {
      adminTierByClub.set(r.club_id, r.admin_role);
    }
  }

  return rows.map((r): MyMembership => {
    const driveLink = r.source_recruitment?.community_whatsapp_link ?? null;
    const clubLink = r.club?.community_whatsapp_link ?? null;
    const resolvedCommunityLink = driveLink ?? clubLink;
    return {
      club_id: r.club_id,
      joined_at: r.joined_at,
      role: r.role ?? "volunteer",
      role_label: r.role_label,
      exclude_from_promote: r.exclude_from_promote ?? false,
      admin_tier: adminTierByClub.get(r.club_id) ?? null,
      club: r.club
        ? { ...r.club, community_whatsapp_link: resolvedCommunityLink }
        : null,
    };
  });
}
