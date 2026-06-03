import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  Application,
  Club,
  Category,
} from "@/lib/database.types";

export interface MyApplication extends Application {
  club:
    | (Pick<
        Club,
        "name" | "slug" | "recruitment_deadline"
      > & {
        // these are on the clubs table after 09b migration; cast in code
        // until types are regenerated
        result_date?: string | null;
        results_published_at?: string | null;
        category: Category | null;
      })
    | null;
}

export interface MyMembership {
  club_id: string;
  joined_at: string;
  club: (Pick<Club, "name" | "slug"> & { category: Category | null }) | null;
}

/** Current user's profile row, or null. */
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
 * Strictly MY applications. Explicit profile_id filter — don't rely on RLS
 * alone (the 9a leak lesson). Includes phase fields on the club join so the
 * row can hide decisions during the review phase.
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
      "*, club:clubs(name, slug, recruitment_deadline, result_date, results_published_at, category:categories(*))",
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MyApplication[];
}

/** Clubs the user is a member of. */
export async function getMyMemberships(): Promise<MyMembership[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("club_members")
    .select("club_id, joined_at, club:clubs(name, slug, category:categories(*))")
    .eq("profile_id", user.id)
    .order("joined_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MyMembership[];
}