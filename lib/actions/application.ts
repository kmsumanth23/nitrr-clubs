"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  buildResponseSchema,
  normalizeResponsesInput,
  type DriveQuestionForValidation,
} from "@/lib/validation/application";
import { getPhase } from "@/lib/phase";

export type ApplicationResult = { error?: string; ok?: boolean };

/**
 * 17C: Read + validate ranked department preferences from FormData.
 * Field name: `preferredDepartments` — JSON-encoded string[].
 *
 * Rules:
 *   - Drive has no departments → returns { value: null } regardless of input
 *   - Drive has departments + student submitted an empty/absent picker
 *     → error ("please rank at least one")
 *   - Length must be ≤ drive.max_department_choices
 *   - No duplicates; every UUID must belong to the drive's departments
 *
 * Length + belongs-to-drive checks can't live in the Zod schema because they
 * depend on the drive being applied to. Schema (`preferredDepartmentsSchema`
 * in `lib/validation/application.ts`) only shape-checks: array of UUIDs +
 * no duplicates.
 */
function readPreferredDepartments(
  formData: FormData,
  driveDepartments: Array<{ id: string }>,
  maxChoices: number | null | undefined,
): { value: string[] | null } | { error: string } {
  if (driveDepartments.length === 0) {
    return { value: null };
  }

  const raw = formData.get("preferredDepartments");
  if (typeof raw !== "string" || raw.length === 0) {
    return { error: "Please rank at least one department preference." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Could not parse department preferences." };
  }

  if (!Array.isArray(parsed)) {
    return { error: "Invalid department preferences format." };
  }

  const asUuids = parsed as string[];
  const capped = typeof maxChoices === "number" ? maxChoices : 2;

  if (asUuids.length === 0) {
    return { error: "Please rank at least one department preference." };
  }
  if (asUuids.length > capped) {
    return { error: `You can rank at most ${capped} departments.` };
  }
  if (new Set(asUuids).size !== asUuids.length) {
    return { error: "You can't pick the same department twice." };
  }

  const validDeptIds = new Set(driveDepartments.map((d) => d.id));
  for (const uuid of asUuids) {
    if (typeof uuid !== "string" || !validDeptIds.has(uuid)) {
      return { error: "Invalid department selected." };
    }
  }

  return { value: asUuids };
}

/**
 * 16B: Apply targets a specific drive by id.
 *
 * Layers of gating (defense in depth):
 *   1. Drive must exist + be published + be in Open phase.
 *   2. Student's `profile.year` must be in `drive.target_years`.
 *   3. Drive must have ≥ 1 question (defensive — existing drives may have
 *      zero after the 16B migration until the admin adds some).
 *   4. Responses must validate against the drive's live question set.
 *   5. `enforce_application_phase` trigger blocks anything the JS check
 *      missed at the DB level.
 *
 * Form fields consumed:
 *   - driveId (required)
 *   - q_<question_id> for each question in the drive
 *
 * If the student already has an application for the drive (any status
 * including withdrawn), it's revived to `pending` with the new responses.
 * The `applications` unique constraint on (recruitment_id, profile_id)
 * ensures at most one row.
 */
export async function submitApplication(
  _prev: ApplicationResult,
  formData: FormData,
): Promise<ApplicationResult> {
  const driveId = formData.get("driveId") as string;
  if (!driveId) return { error: "Missing drive id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };

  // Drive + questions + club slug + departments + student's year in parallel.
  const [driveRes, profileRes] = await Promise.all([
    supabase
      .from("recruitments")
      .select(
        `id, club_id, target_years, deadline, result_date,
         published_at, results_published_at, max_department_choices,
         club:clubs(slug),
         drive_questions(id, question_type, required),
         drive_departments(id)`,
      )
      .eq("id", driveId)
      .not("published_at", "is", null)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("year")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drive: any = driveRes.data;
  const profile = profileRes.data;

  if (!drive) {
    return { error: "This drive isn't accepting applications right now." };
  }

  const phase = getPhase({
    deadline: drive.deadline,
    result_date: drive.result_date,
    published_at: drive.published_at,
    results_published_at: drive.results_published_at,
  });
  if (phase !== "open") {
    return { error: "This drive isn't currently accepting applications." };
  }

  // Eligibility gate. Year-impersonation defense is deferred to a post-16
  // security step — we trust profiles.year here.
  const studentYear = profile?.year ?? null;
  const targetYears: number[] = drive.target_years ?? [1, 2, 3, 4];
  if (studentYear === null) {
    return {
      error:
        "Complete your profile (add your year) before applying to a drive.",
    };
  }
  if (!targetYears.includes(studentYear)) {
    return {
      error: `This drive is only for students in Year ${targetYears.join(", ")}.`,
    };
  }

  const questions = (drive.drive_questions ??
    []) as DriveQuestionForValidation[];

  if (questions.length === 0) {
    return {
      error:
        "This drive doesn't have any questions yet — check back once the club has set them up.",
    };
  }

  // Collect responses from `q_<id>` form fields.
  const rawResponses: Record<string, string> = {};
  for (const q of questions) {
    const val = formData.get(`q_${q.id}`);
    rawResponses[q.id] = typeof val === "string" ? val : "";
  }

  const normalized = normalizeResponsesInput(rawResponses, questions);
  const schema = buildResponseSchema(questions);
  const parsed = schema.safeParse(normalized);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // 17C: ranked department preferences. Required if the drive has any
  // departments; length capped by `max_department_choices`; duplicates and
  // strangers rejected. When the drive has no departments, this stays null.
  const driveDepartments = (drive.drive_departments ?? []) as Array<{
    id: string;
  }>;
  const prefsOrError = readPreferredDepartments(
    formData,
    driveDepartments,
    drive.max_department_choices,
  );
  if ("error" in prefsOrError) return { error: prefsOrError.error };
  const preferredDepartments = prefsOrError.value;

  // Existing application to this drive? Revive; else insert.
  const { data: existing } = await supabase
    .from("applications")
    .select("id, status")
    .eq("recruitment_id", driveId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("applications")
      .update({
        status: "pending",
        responses: parsed.data,
        preferred_departments: preferredDepartments, // 17C
      } as never)
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("applications").insert({
      club_id: drive.club_id,
      recruitment_id: driveId,
      profile_id: user.id,
      status: "pending",
      responses: parsed.data,
      preferred_departments: preferredDepartments, // 17C
    } as never);
    if (error) return { error: error.message };
  }

  revalidatePath("/profile");
  const slug = drive.club?.slug;
  if (slug) {
    revalidatePath(`/clubs/${slug}`);
    revalidatePath(`/clubs/${slug}/apply/${driveId}`);
  }
  redirect("/profile");
}

/** Edit own application. Open phase only. Dynamic responses validated
 *  against the drive's current questions (same shape as submit). */
export async function updateApplication(
  _prev: ApplicationResult,
  formData: FormData,
): Promise<ApplicationResult> {
  const applicationId = formData.get("applicationId") as string;
  if (!applicationId) return { error: "Missing application id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };

  const { data: app } = await supabase
    .from("applications")
    .select(
      `id, profile_id, recruitment_id,
       recruitment:recruitments(
         id, deadline, result_date, published_at, results_published_at,
         max_department_choices,
         drive_questions(id, question_type, required),
         drive_departments(id)
       )`,
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || app.profile_id !== user.id) {
    return { error: "Application not found." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec: any = app.recruitment;
  const phase = getPhase(rec);
  if (phase !== "open") {
    return { error: "You can no longer edit this application." };
  }

  const questions = (rec.drive_questions ??
    []) as DriveQuestionForValidation[];
  if (questions.length === 0) {
    return { error: "This drive has no questions." };
  }

  const rawResponses: Record<string, string> = {};
  for (const q of questions) {
    const val = formData.get(`q_${q.id}`);
    rawResponses[q.id] = typeof val === "string" ? val : "";
  }
  const normalized = normalizeResponsesInput(rawResponses, questions);
  const schema = buildResponseSchema(questions);
  const parsed = schema.safeParse(normalized);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // 17C: re-validate ranked prefs on edit too (drive may have changed).
  const driveDepartments = (rec.drive_departments ?? []) as Array<{
    id: string;
  }>;
  const prefsOrError = readPreferredDepartments(
    formData,
    driveDepartments,
    rec.max_department_choices,
  );
  if ("error" in prefsOrError) return { error: prefsOrError.error };
  const preferredDepartments = prefsOrError.value;

  const { error } = await supabase
    .from("applications")
    .update({
      responses: parsed.data,
      preferred_departments: preferredDepartments, // 17C
    } as never)
    .eq("id", applicationId);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}

/** Withdraw own application. Open phase only. Unchanged from 16A. */
export async function withdrawApplication(
  _prev: ApplicationResult,
  formData: FormData,
): Promise<ApplicationResult> {
  const applicationId = formData.get("applicationId") as string;
  if (!applicationId) return { error: "Missing application id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };

  const { data: app } = await supabase
    .from("applications")
    .select(
      "id, profile_id, recruitment:recruitments(deadline, result_date, results_published_at, published_at)",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || app.profile_id !== user.id) {
    return { error: "Application not found." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec: any = app.recruitment;
  const phase = getPhase(rec);
  if (phase !== "open") {
    return { error: "You can no longer withdraw this application." };
  }

  const { error } = await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}
