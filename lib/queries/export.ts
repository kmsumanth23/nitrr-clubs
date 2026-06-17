import { createClient } from "@/lib/supabase/server";

export interface PersonRow {
  full_name: string | null;
  email: string;
  roll_number: string | null;
  year: number | null;
  branch: string | null;
}

export interface ClubRosterAdminRow extends PersonRow {
  type: "admin";
  tier: "lead" | "manager" | "editor";
  since: string | null; // no separate timestamp on club_admins; null for v1
}

export interface ClubRosterMemberRow extends PersonRow {
  type: "member";
  tier: null;
  since: string; // joined_at
}

export type ClubRosterRow = ClubRosterAdminRow | ClubRosterMemberRow;

/** All admins + members of one club, combined. Authority checked by caller
 *  before invoking. */
export async function getClubRoster(clubId: string): Promise<ClubRosterRow[]> {
  const supabase = await createClient();

  const [adminsRes, membersRes] = await Promise.all([
    supabase
      .from("club_admins")
      .select(
        "admin_role, profile:profiles!club_admins_profile_id_fkey(full_name, email, roll_number, year, branch)",
      )
      .eq("club_id", clubId),
    supabase
      .from("club_members")
      .select(
        "joined_at, profile:profiles!club_members_profile_id_fkey(full_name, email, roll_number, year, branch)",
      )
      .eq("club_id", clubId),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admins: ClubRosterAdminRow[] = ((adminsRes.data ?? []) as any[]).map(
    (a) => ({
      type: "admin" as const,
      tier: a.admin_role as "lead" | "manager" | "editor",
      full_name: a.profile?.full_name ?? null,
      email: a.profile?.email ?? "",
      roll_number: a.profile?.roll_number ?? null,
      year: a.profile?.year ?? null,
      branch: a.profile?.branch ?? null,
      since: null,
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members: ClubRosterMemberRow[] = ((membersRes.data ?? []) as any[]).map(
    (m) => ({
      type: "member" as const,
      tier: null,
      full_name: m.profile?.full_name ?? null,
      email: m.profile?.email ?? "",
      roll_number: m.profile?.roll_number ?? null,
      year: m.profile?.year ?? null,
      branch: m.profile?.branch ?? null,
      since: m.joined_at,
    }),
  );

  return [...admins, ...members];
}

export interface SystemMemberRow extends PersonRow {
  club_name: string;
  club_slug: string;
  joined_at: string;
}

export async function getAllMembers(): Promise<SystemMemberRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("club_members")
    .select(
      "joined_at, club:clubs(slug, name), profile:profiles!club_members_profile_id_fkey(full_name, email, roll_number, year, branch)",
    )
    .order("joined_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    club_name: r.club?.name ?? "",
    club_slug: r.club?.slug ?? "",
    full_name: r.profile?.full_name ?? null,
    email: r.profile?.email ?? "",
    roll_number: r.profile?.roll_number ?? null,
    year: r.profile?.year ?? null,
    branch: r.profile?.branch ?? null,
    joined_at: r.joined_at,
  }));
}

export interface SystemAdminRow extends PersonRow {
  club_name: string;
  club_slug: string;
  tier: string;
}

export async function getAllAdmins(): Promise<SystemAdminRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("club_admins")
    .select(
      "admin_role, club:clubs(slug, name), profile:profiles!club_admins_profile_id_fkey(full_name, email, roll_number, year, branch)",
    );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    club_name: r.club?.name ?? "",
    club_slug: r.club?.slug ?? "",
    tier: r.admin_role ?? "",
    full_name: r.profile?.full_name ?? null,
    email: r.profile?.email ?? "",
    roll_number: r.profile?.roll_number ?? null,
    year: r.profile?.year ?? null,
    branch: r.profile?.branch ?? null,
  }));
}
