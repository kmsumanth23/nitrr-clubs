"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { IconPlus } from "@tabler/icons-react";
import {
  addDriveQuestion,
  type DriveResult,
} from "@/lib/actions/drive";
import { QuestionEditorRow } from "@/components/admin/question-editor-row";
import type { DriveQuestion } from "@/lib/queries/admin-drives";
import type { Phase } from "@/lib/phase";

/**
 * Wraps the question list on the drive editor page.
 * - Renders each question via <QuestionEditorRow>
 * - Provides an "Add question" button at the bottom that inserts a new
 *   question with a default prompt (admin edits immediately)
 * - Disables everything when phase is review or result
 */
export function QuestionBuilder({
  questions,
  driveId,
  clubSlug,
  phase,
}: {
  questions: DriveQuestion[];
  driveId: string;
  clubSlug: string;
  phase: Phase;
}) {
  const disabled = phase === "review" || phase === "result";

  return (
    <div className="space-y-3">
      {questions.length === 0 && !disabled && (
        <p className="rounded-2xl border border-dashed border-line bg-cream/40 p-6 text-center text-sm text-ink-soft">
          No questions yet. Add at least one before publishing this drive.
        </p>
      )}

      {questions.map((q, i) => (
        <QuestionEditorRow
          key={q.id}
          question={q}
          index={i}
          totalCount={questions.length}
          driveId={driveId}
          clubSlug={clubSlug}
          disabled={disabled}
          neighborAboveId={i > 0 ? questions[i - 1].id : null}
          neighborBelowId={
            i < questions.length - 1 ? questions[i + 1].id : null
          }
        />
      ))}

      {!disabled && (
        <AddQuestionForm driveId={driveId} clubSlug={clubSlug} />
      )}
    </div>
  );
}

function AddQuestionForm({
  driveId,
  clubSlug,
}: {
  driveId: string;
  clubSlug: string;
}) {
  const [state, formAction] = useActionState<DriveResult, FormData>(
    addDriveQuestion,
    {},
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="driveId" value={driveId} />
      <input type="hidden" name="__club_slug" value={clubSlug} />
      <input type="hidden" name="prompt" value="New question" />
      <input type="hidden" name="questionType" value="long_text" />
      <input type="hidden" name="required" value="true" />

      <AddButton />

      {state.error && (
        <p className="mt-2 text-xs text-clay">{state.error}</p>
      )}
    </form>
  );
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line bg-white py-3.5 text-sm text-ink-soft transition-colors hover:border-ink/40 hover:bg-cream hover:text-ink disabled:opacity-60"
    >
      <IconPlus size={14} /> {pending ? "Adding…" : "Add question"}
    </button>
  );
}
