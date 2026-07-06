import { createClient } from "@/lib/supabase/server";
import { getPhase, type Phase } from "@/lib/phase";

/** One row in the drive list on the recruitment page. */
export interface DriveListItem {
  id: string;
  name: string;
  description: string | null;
  target_years: number[];
  deadline: string | null;
  result_date: string | null;
  published_at: string | null;
  results_published_at: string | null;
  created_at: string;
  phase: Phase;
  applicant_count: number;
}

/** Drive detail with its questions attached, for the drive editor page. */
export interface DriveWithQuestions {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  target_years: number[];
  deadline: string | null;
  result_date: string | null;
  published_at: string | null;
  results_published_at: string | null;
  created_at: string;
  phase: Phase;
  questions: DriveQuestion[];
}

export interface DriveQuestion {
  id: string;
  prompt: string;
  question_type: "short_text" | "long_text";
  sort_order: number;
  required: boolean;
}

/** List all drives for a club (draft + open + review + result), newest first.
 *  Applicant count computed via Supabase embedded-resource count. */
export async function listDrivesForClub(
  clubId: string,
): Promise<DriveListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recruitments")
    .select(
      `id, name, description, target_years, deadline, result_date,
       published_at, results_published_at, created_at,
       applications(count)`,
    )
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listDrivesForClub failed:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => {
    const phase = getPhase({
      deadline: r.deadline,
      result_date: r.result_date,
      published_at: r.published_at,
      results_published_at: r.results_published_at,
    }) as Phase;
    return {
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
      applicant_count: r.applications?.[0]?.count ?? 0,
    } satisfies DriveListItem;
  });
}

/** Fetch a single drive + its questions (ordered by sort_order). Returns
 *  null if drive not found or user lacks access (RLS enforces). */
export async function getDriveWithQuestions(
  driveId: string,
): Promise<DriveWithQuestions | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recruitments")
    .select(
      `id, club_id, name, description, target_years, deadline, result_date,
       published_at, results_published_at, created_at,
       drive_questions(id, prompt, question_type, sort_order, required)`,
    )
    .eq("id", driveId)
    .order("sort_order", {
      referencedTable: "drive_questions",
      ascending: true,
    })
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("getDriveWithQuestions failed:", error);
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any;
  const phase = getPhase({
    deadline: r.deadline,
    result_date: r.result_date,
    published_at: r.published_at,
    results_published_at: r.results_published_at,
  }) as Phase;

  return {
    id: r.id,
    club_id: r.club_id,
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
      (q: any): DriveQuestion => ({
        id: q.id,
        prompt: q.prompt,
        question_type: q.question_type,
        sort_order: q.sort_order,
        required: q.required,
      }),
    ),
  } satisfies DriveWithQuestions;
}
