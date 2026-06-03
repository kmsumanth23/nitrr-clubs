import { createClient } from "@/lib/supabase/server";
import type {
  Application,
  Profile,
  ApplicationStatus,
} from "@/lib/database.types";

export interface AdminApplication extends Application {
  applicant:
    | (Pick<
        Profile,
        "id" | "full_name" | "email" | "roll_number" | "year" | "branch"
      > | null);
  note_author?: Pick<Profile, "full_name"> | null;
}

export interface ClubPhaseInfo {
  recruitment_deadline: string | null;
  result_date: string | null;
  results_published_at: string | null;
}

/**
 * All applications for a club, with the applicant's profile snapshot and
 * the note author's name (if a note exists). Explicit club_id filter — the
 * 9a leak lesson applies here too.
 */
export async function getApplicationsForClub(
  clubId: string,
): Promise<AdminApplication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      `*,
       applicant:profiles!applications_profile_id_fkey(id, full_name, email, roll_number, year, branch),
       note_author:profiles!applications_note_by_fkey(full_name)`,
    )
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminApplication[];
}

export async function getApplicationCountsForClub(
  clubId: string,
): Promise<Record<ApplicationStatus | "all", number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("status")
    .eq("club_id", clubId);
  if (error) throw error;

  const counts: Record<string, number> = {
    all: data?.length ?? 0,
    pending: 0,
    reviewing: 0,
    accepted: 0,
    rejected: 0,
    withdrawn: 0,
    removed: 0,
  };
  for (const r of data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return counts as Record<ApplicationStatus | "all", number>;
}

/** Phase-driving fields for one club. */
export async function getClubPhaseInfo(
  clubId: string,
): Promise<ClubPhaseInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("recruitment_deadline, result_date, results_published_at")
    .eq("id", clubId)
    .maybeSingle();
  if (error) throw error;
  return (data as ClubPhaseInfo) ?? null;
}
