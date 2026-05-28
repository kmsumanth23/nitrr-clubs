import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  Application,
  Club,
  Category,
} from "@/lib/database.types";

export interface MyApplication extends Application {
  club:
    | (Pick<Club, "name" | "slug" | "recruitment_deadline"> & {
        category: Category | null;
      })
    | null;
}

export interface MyMembership {
  club_id: string;
  joined_at: string;
  club: (Pick<Club, "name" | "slug"> & { category: Category | null }) | null;
}

/** The current user's profile row, or null. */
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

/** All my applications, newest first. RLS limits to the current user. */
export async function getMyApplications(): Promise<MyApplication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      "*, club:clubs(name, slug, recruitment_deadline, category:categories(*))",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MyApplication[];
}

/** Clubs I'm a member of (the roster side). */
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
