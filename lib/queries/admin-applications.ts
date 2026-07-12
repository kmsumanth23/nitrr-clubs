import { createClient } from "@/lib/supabase/server";
import { getPhase, type Phase } from "@/lib/phase";
import type {
  Application,
  Profile,
  ApplicationStatus,
} from "@/lib/database.types";

export interface ApplicationNote {
  id: string;
  body: string;
  created_at: string;
  author: { full_name: string | null } | null;
}

export interface AdminApplication extends Application {
  applicant:
    | (Pick<
        Profile,
        "id" | "full_name" | "email" | "roll_number" | "year" | "branch"
      > | null);
  note_author?: Pick<Profile, "full_name"> | null;
  /** 16B-addendum: append-only note history, newest first. Populated only by
   *  `getApplicationsForDrive`; other queries leave it undefined. */
  notes?: ApplicationNote[];
}

export interface RecruitmentForAdmin {
  id: string;
  name: string | null;
  deadline: string | null;
  result_date: string | null;
  results_published_at: string | null;
  created_at: string;
}

/** Applications + recruitment row for the CURRENT recruitment of a club. */
export async function getApplicationsForClub(
  clubId: string,
): Promise<{
  applications: AdminApplication[];
  recruitment: RecruitmentForAdmin | null;
}> {
  const supabase = await createClient();
  const { data: rec } = await supabase
    .from("recruitments")
    .select("id, name, deadline, result_date, results_published_at, created_at")
    .eq("club_id", clubId)
    .not("published_at", "is", null) // 16A: exclude drafts
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!rec) return { applications: [], recruitment: null };

  const { data, error } = await supabase
    .from("applications")
    .select(
      `*,
       applicant:profiles!applications_profile_id_fkey(id, full_name, email, roll_number, year, branch),
       note_author:profiles!applications_note_by_fkey(full_name)`,
    )
    .eq("recruitment_id", rec.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return {
    applications: (data ?? []) as AdminApplication[],
    recruitment: rec as RecruitmentForAdmin,
  };
}

export async function getApplicationCountsForClub(
  clubId: string,
): Promise<Record<ApplicationStatus | "all", number>> {
  const supabase = await createClient();
  const { data: rec } = await supabase
    .from("recruitments")
    .select("id")
    .eq("club_id", clubId)
    .not("published_at", "is", null) // 16A: exclude drafts
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const counts: Record<string, number> = {
    all: 0, pending: 0, reviewing: 0, accepted: 0,
    rejected: 0, withdrawn: 0, removed: 0,
  };
  if (!rec) return counts as Record<ApplicationStatus | "all", number>;

  const { data, error } = await supabase
    .from("applications")
    .select("status")
    .eq("recruitment_id", rec.id);
  if (error) throw error;

  counts.all = data?.length ?? 0;
  for (const r of data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return counts as Record<ApplicationStatus | "all", number>;
}

export interface RecruitmentHistoryGroup {
  recruitment: RecruitmentForAdmin;
  applications: AdminApplication[];
  counts: Record<ApplicationStatus | "all", number>;
}

/**
 * Applications history for a club, grouped by PRIOR recruitments
 * (everything except the most recent). Newest-first order.
 */
export async function getApplicationHistoryForClub(
  clubId: string,
): Promise<RecruitmentHistoryGroup[]> {
  const supabase = await createClient();

  const { data: recs, error: recErr } = await supabase
    .from("recruitments")
    .select("id, name, deadline, result_date, results_published_at, created_at")
    .eq("club_id", clubId)
    .not("published_at", "is", null) // 16A: exclude drafts (never shown in history)
    .order("created_at", { ascending: false });
  if (recErr) throw recErr;
  if (!recs || recs.length < 2) return []; // need at least 2 to have history

  const priorRecs = recs.slice(1) as RecruitmentForAdmin[]; // skip the current one
  const priorIds = priorRecs.map((r) => r.id);

  const { data: allApps, error: appErr } = await supabase
    .from("applications")
    .select(
      `*,
       applicant:profiles!applications_profile_id_fkey(id, full_name, email, roll_number, year, branch),
       note_author:profiles!applications_note_by_fkey(full_name)`,
    )
    .in("recruitment_id", priorIds)
    .order("created_at", { ascending: false });
  if (appErr) throw appErr;

  const byRec = new Map<string, AdminApplication[]>();
  for (const id of priorIds) byRec.set(id, []);
  for (const a of (allApps ?? []) as AdminApplication[]) {
    const list = byRec.get(a.recruitment_id as unknown as string);
    if (list) list.push(a);
  }

  return priorRecs.map((rec) => {
    const apps = byRec.get(rec.id) ?? [];
    const counts: Record<string, number> = {
      all: apps.length,
      pending: 0, reviewing: 0, accepted: 0,
      rejected: 0, withdrawn: 0, removed: 0,
    };
    for (const a of apps) counts[a.status] = (counts[a.status] ?? 0) + 1;
    return {
      recruitment: rec,
      applications: apps,
      counts: counts as Record<ApplicationStatus | "all", number>,
    };
  });
}

// =========================================================================
// 16B — Per-drive applications fetch
// =========================================================================

export interface DriveQuestionForReview {
  id: string;
  prompt: string;
  question_type: "short_text" | "long_text";
  sort_order: number;
  required: boolean;
}

export interface DriveForReview {
  id: string;
  name: string | null;
  description: string | null;
  target_years: number[];
  deadline: string | null;
  result_date: string | null;
  published_at: string | null;
  results_published_at: string | null;
  created_at: string;
  phase: Phase;
  questions: DriveQuestionForReview[];
}

/** Per-drive applications page: drive metadata + its questions (so response
 *  keys can be rendered against prompts) + all applications for the drive.
 *
 *  Returns null when the drive doesn't exist or is a draft (drafts have
 *  no applications anyway; the caller uses null to redirect). */
export async function getApplicationsForDrive(
  driveId: string,
): Promise<{
  drive: DriveForReview;
  applications: AdminApplication[];
  counts: Record<ApplicationStatus | "all", number>;
} | null> {
  const supabase = await createClient();

  const { data: driveRow, error: driveErr } = await supabase
    .from("recruitments")
    .select(
      `id, name, description, target_years, deadline, result_date,
       published_at, results_published_at, created_at,
       drive_questions(id, prompt, question_type, sort_order, required)`,
    )
    .eq("id", driveId)
    .not("published_at", "is", null)
    .order("sort_order", {
      referencedTable: "drive_questions",
      ascending: true,
    })
    .maybeSingle();

  if (driveErr) {
    console.error("getApplicationsForDrive drive fetch failed:", driveErr);
    return null;
  }
  if (!driveRow) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = driveRow as any;
  const phase = getPhase({
    deadline: r.deadline,
    result_date: r.result_date,
    published_at: r.published_at,
    results_published_at: r.results_published_at,
  });
  if (!phase || phase === "draft") return null;

  const drive: DriveForReview = {
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    target_years: r.target_years ?? [1, 2, 3, 4],
    deadline: r.deadline,
    result_date: r.result_date,
    published_at: r.published_at,
    results_published_at: r.results_published_at,
    created_at: r.created_at,
    phase,
    questions: (r.drive_questions ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (q: any): DriveQuestionForReview => ({
        id: q.id,
        prompt: q.prompt,
        question_type: q.question_type,
        sort_order: q.sort_order,
        required: q.required,
      }),
    ),
  };

  const { data: appsData, error: appsErr } = await supabase
    .from("applications")
    .select(
      `*,
       applicant:profiles!applications_profile_id_fkey(id, full_name, email, roll_number, year, branch),
       note_author:profiles!applications_note_by_fkey(full_name)`,
    )
    .eq("recruitment_id", driveId)
    .order("created_at", { ascending: false });
  if (appsErr) throw appsErr;

  const applications = (appsData ?? []) as AdminApplication[];

  // Fetch note history for all applications in one shot, then stitch onto rows.
  // Separate query rather than an embedded join so RLS on applications and
  // application_notes evaluate independently and the shape stays predictable.
  const appIds = applications.map((a) => a.id);
  const notesByAppId = new Map<string, ApplicationNote[]>();
  if (appIds.length > 0) {
    const { data: noteRows, error: notesErr } = await supabase
      .from("application_notes")
      .select(
        `id, application_id, body, created_at,
         author:profiles!application_notes_author_id_fkey(full_name)`,
      )
      .in("application_id", appIds)
      .order("created_at", { ascending: false });
    if (notesErr) {
      console.error("getApplicationsForDrive notes fetch failed:", notesErr);
      throw notesErr;
    }
    for (const raw of noteRows ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const n = raw as any;
      const list = notesByAppId.get(n.application_id) ?? [];
      list.push({
        id: n.id,
        body: n.body,
        created_at: n.created_at,
        author: n.author ?? null,
      });
      notesByAppId.set(n.application_id, list);
    }
  }

  const enriched: AdminApplication[] = applications.map((a) => ({
    ...a,
    notes: notesByAppId.get(a.id) ?? [],
  }));

  const counts: Record<string, number> = {
    all: enriched.length,
    pending: 0, reviewing: 0, accepted: 0,
    rejected: 0, withdrawn: 0, removed: 0,
  };
  for (const a of enriched)
    counts[a.status] = (counts[a.status] ?? 0) + 1;

  return {
    drive,
    applications: enriched,
    counts: counts as Record<ApplicationStatus | "all", number>,
  };
}
