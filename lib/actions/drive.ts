"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createDriveSchema,
  updateDriveSchema,
  publishDriveSchema,
  deleteDriveSchema,
  addQuestionSchema,
  updateQuestionSchema,
  deleteQuestionSchema,
  swapQuestionOrderSchema,
} from "@/lib/validation/drive";

/** Common result shape for drive actions. Flat all-optional (matches the
 *  AuthResult / ClubEditResult / ReviewResult convention) so `useActionState`
 *  can be seeded with `{}` and consumers can access `state.error` / `state.ok`
 *  without narrowing. */
export type DriveResult = {
  error?: string;
  ok?: boolean;
  driveId?: string;
  questionId?: string;
};

function revalidateDrive(clubSlug: string, driveId?: string) {
  revalidatePath(`/admin/clubs/${clubSlug}/recruitment`);
  if (driveId) {
    revalidatePath(`/admin/clubs/${clubSlug}/recruitment/${driveId}`);
  }
  revalidatePath(`/admin/clubs/${clubSlug}`);
}

// ============================================================================
// 1. createDrive — creates in DRAFT mode + auto-populates 3 default questions
// ============================================================================
export async function createDrive(
  _prev: DriveResult,
  formData: FormData,
): Promise<DriveResult> {
  const clubSlug = formData.get("__club_slug") as string;

  const parsed = createDriveSchema.safeParse({
    clubId: formData.get("clubId"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    targetYears: JSON.parse(
      (formData.get("targetYears") as string) ?? "[]",
    ),
    deadline: (formData.get("deadline") as string) ?? "",
    resultDate: (formData.get("resultDate") as string) ?? "",
    interviewWhatsappLink: formData.get("interviewWhatsappLink") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  // The generated RPC types mark description/deadline/result_date as non-null
  // string, but the SQL function accepts NULL. Cast to bypass the incorrect
  // type — same pattern used by startNewRecruitment in recruitment.ts.
  const { data, error } = await supabase.rpc("create_drive", {
    club_id_in: parsed.data.clubId,
    name_in: parsed.data.name,
    description_in: parsed.data.description,
    target_years_in: parsed.data.targetYears,
    deadline_in: parsed.data.deadline,
    result_date_in: parsed.data.resultDate,
    interview_whatsapp_link_in: parsed.data.interviewWhatsappLink, // 16C
  } as never);
  if (error) {
    console.error("createDrive rpc failed:", error);
    return { error: error.message };
  }

  const newDriveId = data as unknown as string;

  // Optional publish-after-create for the "Save & Publish" button on the
  // create page. If publish fails (e.g. missing deadline), we still land on
  // the editor with the drive intact — user can retry there.
  const publishAfter = formData.get("publishAfter") === "true";
  if (publishAfter) {
    const { error: pubErr } = await supabase.rpc("publish_drive", {
      drive_id_in: newDriveId,
    });
    if (pubErr) {
      console.error("createDrive publish-after-create failed:", pubErr);
      // Fall through to editor redirect — drive was created successfully.
    }
  }

  revalidateDrive(clubSlug, newDriveId);

  // Send admin to the editor for the new drive
  redirect(`/admin/clubs/${clubSlug}/recruitment/${newDriveId}`);
}

// ============================================================================
// 2. updateDrive — edits an existing drive's metadata
// ============================================================================
export async function updateDrive(
  _prev: DriveResult,
  formData: FormData,
): Promise<DriveResult> {
  const clubSlug = formData.get("__club_slug") as string;

  const parsed = updateDriveSchema.safeParse({
    driveId: formData.get("driveId"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    targetYears: JSON.parse(
      (formData.get("targetYears") as string) ?? "[]",
    ),
    deadline: (formData.get("deadline") as string) ?? "",
    resultDate: (formData.get("resultDate") as string) ?? "",
    interviewWhatsappLink: formData.get("interviewWhatsappLink") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  // Same generated-type mismatch as create_drive — nullable fields cast away.
  const { error } = await supabase.rpc("update_drive", {
    drive_id_in: parsed.data.driveId,
    name_in: parsed.data.name,
    description_in: parsed.data.description,
    target_years_in: parsed.data.targetYears,
    deadline_in: parsed.data.deadline,
    result_date_in: parsed.data.resultDate,
    interview_whatsapp_link_in: parsed.data.interviewWhatsappLink, // 16C
  } as never);
  if (error) {
    console.error("updateDrive rpc failed:", error);
    return { error: error.message };
  }

  revalidateDrive(clubSlug, parsed.data.driveId);
  return { ok: true, driveId: parsed.data.driveId };
}

// ============================================================================
// 3. publishDrive — flip draft → open. Requires deadline + ≥1 question.
// ============================================================================
export async function publishDrive(
  _prev: DriveResult,
  formData: FormData,
): Promise<DriveResult> {
  const clubSlug = formData.get("__club_slug") as string;

  const parsed = publishDriveSchema.safeParse({
    driveId: formData.get("driveId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_drive", {
    drive_id_in: parsed.data.driveId,
  });
  if (error) {
    console.error("publishDrive rpc failed:", error);
    return { error: error.message };
  }

  revalidateDrive(clubSlug, parsed.data.driveId);
  return { ok: true, driveId: parsed.data.driveId };
}

// ============================================================================
// 4. deleteDrive — cascade-deletes drive + its questions
// ============================================================================
export async function deleteDrive(
  _prev: DriveResult,
  formData: FormData,
): Promise<DriveResult> {
  const clubSlug = formData.get("__club_slug") as string;

  const parsed = deleteDriveSchema.safeParse({
    driveId: formData.get("driveId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_drive", {
    drive_id_in: parsed.data.driveId,
  });
  if (error) {
    console.error("deleteDrive rpc failed:", error);
    return { error: error.message };
  }

  revalidateDrive(clubSlug);

  // Send admin back to the drive list
  redirect(`/admin/clubs/${clubSlug}/recruitment`);
}

// ============================================================================
// 5. addDriveQuestion
// ============================================================================
export async function addDriveQuestion(
  _prev: DriveResult,
  formData: FormData,
): Promise<DriveResult> {
  const clubSlug = formData.get("__club_slug") as string;
  const driveIdForRevalidation = formData.get("driveId") as string;

  const parsed = addQuestionSchema.safeParse({
    driveId: formData.get("driveId"),
    prompt: formData.get("prompt"),
    questionType: formData.get("questionType"),
    required: formData.get("required") === "true",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_drive_question", {
    drive_id_in: parsed.data.driveId,
    prompt_in: parsed.data.prompt,
    question_type_in: parsed.data.questionType,
    required_in: parsed.data.required,
  });
  if (error) {
    console.error("addDriveQuestion rpc failed:", error);
    return { error: error.message };
  }

  revalidateDrive(clubSlug, driveIdForRevalidation);
  return { ok: true, questionId: data as unknown as string };
}

// ============================================================================
// 6. updateDriveQuestion
// ============================================================================
export async function updateDriveQuestion(
  _prev: DriveResult,
  formData: FormData,
): Promise<DriveResult> {
  const clubSlug = formData.get("__club_slug") as string;
  const driveIdForRevalidation = formData.get("driveId") as string;

  const parsed = updateQuestionSchema.safeParse({
    questionId: formData.get("questionId"),
    prompt: formData.get("prompt"),
    questionType: formData.get("questionType"),
    required: formData.get("required") === "true",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_drive_question", {
    question_id_in: parsed.data.questionId,
    prompt_in: parsed.data.prompt,
    question_type_in: parsed.data.questionType,
    required_in: parsed.data.required,
  });
  if (error) {
    console.error("updateDriveQuestion rpc failed:", error);
    return { error: error.message };
  }

  revalidateDrive(clubSlug, driveIdForRevalidation);
  return { ok: true, questionId: parsed.data.questionId };
}

// ============================================================================
// 7. deleteDriveQuestion
// ============================================================================
export async function deleteDriveQuestion(
  _prev: DriveResult,
  formData: FormData,
): Promise<DriveResult> {
  const clubSlug = formData.get("__club_slug") as string;
  const driveIdForRevalidation = formData.get("driveId") as string;

  const parsed = deleteQuestionSchema.safeParse({
    questionId: formData.get("questionId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_drive_question", {
    question_id_in: parsed.data.questionId,
  });
  if (error) {
    console.error("deleteDriveQuestion rpc failed:", error);
    return { error: error.message };
  }

  revalidateDrive(clubSlug, driveIdForRevalidation);
  return { ok: true };
}

// ============================================================================
// 8. swapDriveQuestionOrder
// ============================================================================
export async function swapDriveQuestionOrder(
  _prev: DriveResult,
  formData: FormData,
): Promise<DriveResult> {
  const clubSlug = formData.get("__club_slug") as string;
  const driveIdForRevalidation = formData.get("driveId") as string;

  const parsed = swapQuestionOrderSchema.safeParse({
    questionAId: formData.get("questionAId"),
    questionBId: formData.get("questionBId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("swap_drive_question_order", {
    question_a_in: parsed.data.questionAId,
    question_b_in: parsed.data.questionBId,
  });
  if (error) {
    console.error("swapDriveQuestionOrder rpc failed:", error);
    return { error: error.message };
  }

  revalidateDrive(clubSlug, driveIdForRevalidation);
  return { ok: true };
}
