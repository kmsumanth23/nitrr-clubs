import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

export type AdminTier = "lead" | "manager" | "editor";

export interface ClubAdminView {
  profile_id: string;
  tier: AdminTier;
  profile:
    | (Pick<
        Profile,
        "id" | "full_name" | "email" | "roll_number" | "year" | "branch"
      > | null);
}

const TIER_ORDER: Record<AdminTier, number> = {
  lead: 0,
  manager: 1,
  editor: 2,
};

/** All admins of a club, ordered by tier (lead first) then by name.
 *  Explicit profile_id filter not needed — we filter by club_id; profile
 *  search RLS limits which profiles are visible. */
export async function getAdminsForClub(
  clubId: string,
): Promise<ClubAdminView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_admins")
    .select(
      "profile_id, admin_role, profile:profiles!club_admins_profile_id_fkey(id, full_name, email, roll_number, year, branch)",
    )
    .eq("club_id", clubId);
  if (error) throw error;

   
  const rows = (data ?? []) as Array<{
    profile_id: string;
    admin_role: AdminTier;
    profile: ClubAdminView["profile"];
  }>;

  return rows
    .map((r) => ({
      profile_id: r.profile_id,
      tier: r.admin_role,
      profile: r.profile,
    }))
    .sort((a, b) => {
      const ta = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
      if (ta !== 0) return ta;
      const na = a.profile?.full_name ?? "";
      const nb = b.profile?.full_name ?? "";
      return na.localeCompare(nb);
    });
}
