import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";
import { ROLE_ENUM, type Role } from "@/lib/roles";

/**
 * A member of a club, enriched with the fields the admin members page needs.
 *
 * Spec note (17B): the goal doc calls this `MembershipDetail`, but the file
 * has always exported it as `ClubMemberView`. Renaming would ripple through
 * every consumer; keeping the name and adding a type alias for the new name.
 */
export interface ClubMemberView {
  profile_id: string;
  joined_at: string;
  profile:
    | (Pick<
        Profile,
        "id" | "full_name" | "email" | "roll_number" | "year" | "branch"
      > | null);
  is_lead: boolean;
  /** 17B: structural role tag. */
  role: Role;
  /** 17B: custom label snapshot from the source drive (or manual edit). */
  role_label: string | null;
  /** 17B: UI-only flag — filtered out of the bulk-promote picker by default. */
  exclude_from_promote: boolean;
  /** 17B: FK back to the drive that materialized this membership, or null for
   *  legacy pre-17B rows. `ON DELETE SET NULL` on the FK. */
  source_recruitment_id: string | null;
}

/** Alias for the 17B goal-doc name. Both names refer to the same shape. */
export type MembershipDetail = ClubMemberView;

/** Roster for a club, with profile snapshot + a flag for "this member is
 *  also a lead", so the UI can disable removal for them. */
export async function getMembersForClub(
  clubId: string,
): Promise<ClubMemberView[]> {
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("club_members")
    .select(
      `profile_id, joined_at, role, role_label, exclude_from_promote, source_recruitment_id,
       profile:profiles!club_members_profile_id_fkey(id, full_name, email, roll_number, year, branch)`,
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

  return members.map((m) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = m as any;
    return {
      profile_id: m.profile_id,
      joined_at: m.joined_at,
      profile: raw.profile ?? null,
      is_lead: leadsSet.has(m.profile_id),
      role: (raw.role ?? "volunteer") as Role,
      role_label: raw.role_label ?? null,
      exclude_from_promote: raw.exclude_from_promote ?? false,
      source_recruitment_id: raw.source_recruitment_id ?? null,
    };
  });
}

/**
 * 17B: same roster as `getMembersForClub`, but bucketed by structural role.
 * Keys iterate in fixed order:
 *   overall_coordinator → head_coordinator → core_coordinator →
 *   coordinator → volunteer
 *
 * Empty roles are omitted so the admin page can render only populated
 * sections. Within a role the ordering matches `getMembersForClub`
 * (joined_at desc).
 */
export async function getMembersGroupedByRole(
  clubId: string,
): Promise<Array<{ role: Role; members: ClubMemberView[] }>> {
  const flat = await getMembersForClub(clubId);

  // Seed the map in display order so the returned array is stable.
  const displayOrder: Role[] = [
    "overall_coordinator",
    "head_coordinator",
    "core_coordinator",
    "coordinator",
    "volunteer",
  ];
  const byRole = new Map<Role, ClubMemberView[]>();
  for (const r of displayOrder) byRole.set(r, []);

  for (const m of flat) {
    // Defensive against unknown values sneaking through — coerce to volunteer.
    const key: Role = (ROLE_ENUM as readonly string[]).includes(m.role)
      ? (m.role as Role)
      : "volunteer";
    byRole.get(key)!.push(m);
  }

  return displayOrder
    .map((role) => ({ role, members: byRole.get(role)! }))
    .filter((group) => group.members.length > 0);
}
