import { createClient } from "@/lib/supabase/server";

export interface SysadminCounts {
  clubs_active: number;
  clubs_archived: number;
  members: number;
  events: number;
  recruitments: number;
}

export interface ClubAdminless {
  id: string;
  slug: string;
  name: string;
}

export interface RecruitmentOverdue {
  recruitment_id: string;
  club_id: string;
  club_slug: string;
  club_name: string;
  recruitment_name: string | null;
  result_date: string;
  days_overdue: number;
}

export interface SuperAdminProfile {
  id: string;
  full_name: string | null;
  email: string;
  roll_number: string | null;
  year: number | null;
  branch: string | null;
}

export interface ArchivedClub {
  id: string;
  slug: string;
  name: string;
  archived_at: string;
}

/** Top-level counts for the sysadmin landing page. */
export async function getSysadminCounts(): Promise<SysadminCounts> {
  const supabase = await createClient();

  const [
    activeClubsRes,
    archivedClubsRes,
    membersRes,
    eventsRes,
    recruitmentsRes,
  ] = await Promise.all([
    supabase
      .from("clubs")
      .select("*", { count: "exact", head: true })
      .is("archived_at", null),
    supabase
      .from("clubs")
      .select("*", { count: "exact", head: true })
      .not("archived_at", "is", null),
    supabase.from("club_members").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("recruitments").select("*", { count: "exact", head: true }),
  ]);

  return {
    clubs_active: activeClubsRes.count ?? 0,
    clubs_archived: archivedClubsRes.count ?? 0,
    members: membersRes.count ?? 0,
    events: eventsRes.count ?? 0,
    recruitments: recruitmentsRes.count ?? 0,
  };
}

/** Active clubs that have zero club_admins rows. Anomaly card. */
export async function getClubsWithoutAdmins(): Promise<ClubAdminless[]> {
  const supabase = await createClient();
  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, slug, name")
    .is("archived_at", null);
  if (!clubs || clubs.length === 0) return [];

  const { data: adminClubs } = await supabase
    .from("club_admins")
    .select("club_id");
  const withAdmins = new Set(
    (adminClubs ?? []).map((r) => r.club_id as string),
  );

  return clubs
    .filter((c) => !withAdmins.has(c.id))
    .map((c) => ({ id: c.id, slug: c.slug, name: c.name }));
}

/** Recruitments past their result_date but not yet published. */
export async function getRecruitmentsOverdue(): Promise<RecruitmentOverdue[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("recruitments_overdue");
  if (error) return [];
  return (data ?? []) as RecruitmentOverdue[];
}

/** All current sysadmins. */
export async function getSuperAdmins(): Promise<SuperAdminProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, roll_number, year, branch")
    .eq("role", "super_admin")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as SuperAdminProfile[];
}

/** Archived clubs. */
export async function getArchivedClubs(): Promise<ArchivedClub[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("id, slug, name, archived_at")
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ArchivedClub[];
}

/** Categories list — for the create-club form. */
export async function getCategoriesForCreate() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name")
    .order("sort_order");
  return data ?? [];
}

/** Check whether the current user is a sysadmin. Guards sysadmin pages. */
export async function isSysadmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return data?.role === "super_admin";
}
