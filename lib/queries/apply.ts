import { createClient } from "@/lib/supabase/server";
import { getPhase, type Phase } from "@/lib/phase";
import type { ApplicationStatus } from "@/lib/database.types";

/**
 * Public apply queries — student-facing.
 *
 * Both queries filter drafts implicitly by requiring `published_at is not
 * null`. Only Open-phase drives are exposed to the apply flow; Review /
 * Result phase drives are not returned.
 *
 * Eligibility is computed against the student's `profiles.year`. Per the
 * 16B decision, we do NOT snapshot year onto the application row at
 * submit-time — a dedicated defense against year-impersonation is
 * deferred to a post-16 step.
 */

export interface OpenDriveForStudent {
  id: string;
  name: string;
  description: string | null;
  target_years: number[];
  deadline: string | null;
  /** True when studentYear ∈ target_years. False when studentYear is null
   *  (profile incomplete) or outside the target set. */
  eligible: boolean;
  /** True when the student has a live (non-withdrawn) application to this
   *  drive. Used by the drive card to swap "Apply" → "Edit application". */
  has_applied: boolean;
  application_status: ApplicationStatus | null;
}

/** All open drives for a club, annotated with the student's eligibility +
 *  existing application state. Sorted newest-first.
 *
 *  `studentId` is nullable so the signed-out landing case ("browse open
 *  drives without logging in first") works. When null, `has_applied`
 *  always resolves to false.
 *
 *  Two-query design: the recruitments fetch does NOT embed applications.
 *  `applications` grants SELECT to `authenticated` only, so an embedded
 *  join fails with 42501 for signed-out (anon) viewers. Applications are
 *  fetched in a separate second query only when studentId is present.
 *  Matches the pattern used by `listDrivesForClub` for pending counts. */
export async function getOpenDrivesForClub(
  clubId: string,
  studentId: string | null,
  studentYear: number | null,
): Promise<OpenDriveForStudent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recruitments")
    .select(
      `id, name, description, target_years, deadline, result_date,
       published_at, results_published_at, created_at`,
    )
    .eq("club_id", clubId)
    .not("published_at", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getOpenDrivesForClub failed:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openDrives = ((data ?? []) as any[])
    .map((r) => {
      const phase = getPhase({
        deadline: r.deadline,
        result_date: r.result_date,
        published_at: r.published_at,
        results_published_at: r.results_published_at,
      });
      return { r, phase };
    })
    .filter(({ phase }) => phase === "open");

  if (openDrives.length === 0) return [];

  // Second query: student's own applications for these drives (signed-in only).
  const myAppByDrive = new Map<string, { status: ApplicationStatus }>();
  if (studentId) {
    const driveIds = openDrives.map(({ r }) => r.id);
    const { data: apps } = await supabase
      .from("applications")
      .select("recruitment_id, status")
      .in("recruitment_id", driveIds)
      .eq("profile_id", studentId);
    for (const a of (apps ?? []) as Array<{
      recruitment_id: string;
      status: string;
    }>) {
      myAppByDrive.set(a.recruitment_id, {
        status: a.status as ApplicationStatus,
      });
    }
  }

  return openDrives.map(({ r }) => {
    const targetYears: number[] = r.target_years ?? [1, 2, 3, 4];
    const eligible =
      studentYear !== null && targetYears.includes(studentYear);

    const myApp = myAppByDrive.get(r.id);
    const hasLiveApp = !!myApp && myApp.status !== "withdrawn";

    return {
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      target_years: targetYears,
      deadline: r.deadline,
      eligible,
      has_applied: hasLiveApp,
      application_status: (myApp?.status ?? null) as ApplicationStatus | null,
    } satisfies OpenDriveForStudent;
  });
}

/** Drive detail for the apply page: questions + eligibility + the student's
 *  existing application (if any) so the form can pre-populate on re-apply
 *  or edit. Returns null when the drive doesn't exist, isn't published, or
 *  isn't in Open phase.
 *
 *  Shape mirrors `getApplicationsForDrive` — nested `drive` block for the
 *  data-of-record, sibling flags (`eligible`, `existing_application`) for
 *  per-viewer state. */
export interface DriveForApply {
  drive: {
    id: string;
    club_id: string;
    club_slug: string;
    name: string;
    description: string | null;
    target_years: number[];
    deadline: string | null;
    interview_whatsapp_link: string | null; // 16C
    community_whatsapp_link: string | null; // 17A
    role_on_accept: string; // 17B
    role_label: string | null; // 17B
    phase: Phase;
    questions: DriveQuestionForApply[];
  };
  eligible: boolean;
  existing_application: {
    id: string;
    status: ApplicationStatus;
    responses: Record<string, string>;
  } | null;
}

export interface DriveQuestionForApply {
  id: string;
  prompt: string;
  question_type: "short_text" | "long_text";
  sort_order: number;
  required: boolean;
}

export async function getDriveForApply(
  driveId: string,
  studentId: string,
  studentYear: number | null,
): Promise<DriveForApply | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recruitments")
    .select(
      `id, club_id, name, description, target_years, deadline, result_date,
       published_at, results_published_at, interview_whatsapp_link,
       community_whatsapp_link, role_on_accept, role_label,
       club:clubs(slug),
       drive_questions(id, prompt, question_type, sort_order, required)`,
    )
    .eq("id", driveId)
    .not("published_at", "is", null)
    .order("sort_order", {
      referencedTable: "drive_questions",
      ascending: true,
    })
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("getDriveForApply failed:", error);
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any;
  const phase = getPhase({
    deadline: r.deadline,
    result_date: r.result_date,
    published_at: r.published_at,
    results_published_at: r.results_published_at,
  });
  // Apply flow is Open-phase only; other phases are not reachable via
  // this query.
  if (phase !== "open") return null;

  const targetYears: number[] = r.target_years ?? [1, 2, 3, 4];
  const eligible = studentYear !== null && targetYears.includes(studentYear);

  const { data: existingApp } = await supabase
    .from("applications")
    .select("id, status, responses")
    .eq("recruitment_id", driveId)
    .eq("profile_id", studentId)
    .maybeSingle();

  return {
    drive: {
      id: r.id,
      club_id: r.club_id,
      club_slug: r.club?.slug ?? "",
      name: r.name,
      description: r.description ?? null,
      target_years: targetYears,
      deadline: r.deadline,
      interview_whatsapp_link: r.interview_whatsapp_link ?? null, // 16C
      community_whatsapp_link: r.community_whatsapp_link ?? null, // 17A
      role_on_accept: r.role_on_accept ?? "volunteer", // 17B
      role_label: r.role_label ?? null, // 17B
      phase,
      questions: (r.drive_questions ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q: any): DriveQuestionForApply => ({
          id: q.id,
          prompt: q.prompt,
          question_type: q.question_type,
          sort_order: q.sort_order,
          required: q.required,
        }),
      ),
    },
    eligible,
    existing_application: existingApp
      ? {
          id: existingApp.id,
          status: existingApp.status as ApplicationStatus,
          responses: (existingApp.responses ?? {}) as Record<string, string>,
        }
      : null,
  };
}
