import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

export interface ClubMemberView {
  profile_id: string;
  joined_at: string;
  profile:
    | (Pick<
        Profile,
        "id" | "full_name" | "email" | "roll_number" | "year" | "branch"
      > | null);
  is_lead: boolean;
}

/** Roster for a club, with profile snapshot + a flag for "this member is
 *  also a lead", so the UI can disable removal for them. */
export async function getMembersForClub(
  clubId: string,
): Promise<ClubMemberView[]> {
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("club_members")
    .select(
      "profile_id, joined_at, profile:profiles!club_members_profile_id_fkey(id, full_name, email, roll_number, year, branch)",
    )
    .eq("club_id", clubId)
    .order("joined_at", { ascending: false });
  if (error) throw error;
  if (!members) return [];

  // figure out who among them is a lead of this club
  const profileIds = members.map((m) => m.profile_id);
  const leadsSet = new Set<string>();
  if (profileIds.length > 0) {
    const { data: leads } = await supabase
      .from("club_admins")
      .select("profile_id")
      .eq("club_id", clubId)
      .eq("admin_role", "lead")
      .in("profile_id", profileIds);
    for (const r of leads ?? []) leadsSet.add(r.profile_id);
  }

  return members.map((m) => ({
    profile_id: m.profile_id,
    joined_at: m.joined_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profile: ((m as any).profile ?? null),
    is_lead: leadsSet.has(m.profile_id),
  }));
}
