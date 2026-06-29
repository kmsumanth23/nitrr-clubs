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
