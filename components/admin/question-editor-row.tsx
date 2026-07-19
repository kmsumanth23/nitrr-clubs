"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  IconArrowUp,
  IconArrowDown,
  IconTrash,
} from "@tabler/icons-react";
import {
  updateDriveQuestion,
  deleteDriveQuestion,
  swapDriveQuestionOrder,
  type DriveResult,
} from "@/lib/actions/drive";
import { Modal } from "@/components/ui/modal";
import type { DriveQuestion } from "@/lib/queries/admin-drives";

/**
 * A single question row in the drive editor. Auto-saves on:
 *  - prompt blur (if value changed)
 *  - type button click
 *  - required toggle change
 *
 * Delete + reorder are separate mini-forms with explicit user action.
 */
export function QuestionEditorRow({
  question,
  index,
  totalCount,
  driveId,
  clubSlug,
  disabled,
  neighborAboveId,
  neighborBelowId,
}: {
  question: DriveQuestion;
  index: number;
  totalCount: number;
  driveId: string;
  clubSlug: string;
  disabled: boolean;
  neighborAboveId: string | null;
  neighborBelowId: string | null;
}) {
  const [state, formAction] = useActionState<DriveResult, FormData>(
    updateDriveQuestion,
    {},
  );

  const [prompt, setPrompt] = React.useState(question.prompt);
  const [type, setType] = React.useState<"short_text" | "long_text">(
    question.question_type,
  );
  const [required, setRequired] = React.useState(question.required);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // 17A: auto-resize the prompt textarea as the user types multi-line
  // questions. CSS `field-sizing: content` would replace this but Firefox
  // still lacks support (as of early 2026) — the ref + effect works everywhere.
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [prompt]);

  function buildFormData(overrides: {
    prompt?: string;
    type?: "short_text" | "long_text";
    required?: boolean;
  } = {}): FormData {
    const fd = new FormData();
    fd.set("questionId", question.id);
    fd.set("driveId", driveId);
    fd.set("__club_slug", clubSlug);
    fd.set("prompt", overrides.prompt ?? prompt);
    fd.set("questionType", overrides.type ?? type);
    fd.set("required", (overrides.required ?? required).toString());
    return fd;
  }

  function savePrompt() {
    if (disabled) return;
    if (prompt.trim() === "") return; // don't submit empty
    if (prompt === question.prompt) return; // no change
    React.startTransition(() => formAction(buildFormData()));
  }

  function handleTypeChange(nextType: "short_text" | "long_text") {
    if (disabled) return;
    if (nextType === type) return;
    setType(nextType);
    React.startTransition(() => formAction(buildFormData({ type: nextType })));
  }

  function handleRequiredChange(nextRequired: boolean) {
    if (disabled) return;
    setRequired(nextRequired);
    React.startTransition(() =>
      formAction(buildFormData({ required: nextRequired })),
    );
  }

  const canSwapUp = !disabled && !!neighborAboveId;
  const canSwapDown = !disabled && !!neighborBelowId;

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        {/* Reorder + number column */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <ReorderButton
            aId={question.id}
            bId={neighborAboveId}
            enabled={canSwapUp}
            direction="up"
            driveId={driveId}
            clubSlug={clubSlug}
          />
          <span className="text-xs font-medium text-ink-soft">{index + 1}</span>
          <ReorderButton
            aId={question.id}
            bId={neighborBelowId}
            enabled={canSwapDown}
            direction="down"
            driveId={driveId}
            clubSlug={clubSlug}
          />
        </div>

        {/* Content column */}
        <div className="min-w-0 flex-1 space-y-3">
          {/* Prompt textarea — auto-resizes on prompt change (17A) */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onBlur={savePrompt}
            disabled={disabled}
            rows={2}
            placeholder="Type your question…"
            style={{ minHeight: "60px" }}
            className="w-full resize-none overflow-hidden whitespace-pre-wrap rounded-xl border border-line bg-cream/40 p-2.5 text-sm text-ink outline-none focus:border-indigo focus:bg-white disabled:opacity-50"
          />

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Type toggle */}
            <div className="inline-flex overflow-hidden rounded-full border border-line">
              <button
                type="button"
                onClick={() => handleTypeChange("long_text")}
                disabled={disabled}
                aria-pressed={type === "long_text"}
                className={
                  "px-3 py-1 text-xs transition-colors disabled:opacity-50 " +
                  (type === "long_text"
                    ? "bg-ink text-cream"
                    : "bg-white text-ink hover:bg-cream")
                }
              >
                Paragraph
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("short_text")}
                disabled={disabled}
                aria-pressed={type === "short_text"}
                className={
                  "px-3 py-1 text-xs transition-colors disabled:opacity-50 " +
                  (type === "short_text"
                    ? "bg-ink text-cream"
                    : "bg-white text-ink hover:bg-cream")
                }
              >
                Short
              </button>
            </div>

            {/* Required toggle */}
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => handleRequiredChange(e.target.checked)}
                disabled={disabled}
                className="h-3.5 w-3.5 rounded border-line accent-indigo"
              />
              <span className="text-xs text-ink-soft">Required</span>
            </label>

            {/* Save error / status */}
            {state.error && (
              <span className="text-[11px] text-clay">{state.error}</span>
            )}
          </div>
        </div>

        {/* Delete column */}
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={disabled}
          aria-label="Delete question"
          className="rounded-full p-1.5 text-ink-soft hover:bg-clay/10 hover:text-clay disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconTrash size={15} />
        </button>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DeleteConfirmForm
          questionId={question.id}
          driveId={driveId}
          clubSlug={clubSlug}
          onDone={() => setConfirmDelete(false)}
          totalCount={totalCount}
        />
      </Modal>
    </div>
  );
}

/* --- Reorder mini-form --- */

function ReorderButton({
  aId,
  bId,
  enabled,
  direction,
  driveId,
  clubSlug,
}: {
  aId: string;
  bId: string | null;
  enabled: boolean;
  direction: "up" | "down";
  driveId: string;
  clubSlug: string;
}) {
  const [, formAction] = useActionState<DriveResult, FormData>(
    swapDriveQuestionOrder,
    {},
  );

  if (!enabled || !bId) {
    return (
      <span
        aria-hidden
        className="rounded-full p-1 text-ink-soft/30"
      >
        {direction === "up" ? (
          <IconArrowUp size={12} />
        ) : (
          <IconArrowDown size={12} />
        )}
      </span>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="questionAId" value={aId} />
      <input type="hidden" name="questionBId" value={bId} />
      <input type="hidden" name="driveId" value={driveId} />
      <input type="hidden" name="__club_slug" value={clubSlug} />
      <button
        type="submit"
        aria-label={`Move ${direction}`}
        className="rounded-full p-1 text-ink-soft hover:bg-cream hover:text-ink"
      >
        {direction === "up" ? (
          <IconArrowUp size={12} />
        ) : (
          <IconArrowDown size={12} />
        )}
      </button>
    </form>
  );
}

/* --- Delete mini-form (inside modal) --- */

function DeleteConfirmForm({
  questionId,
  driveId,
  clubSlug,
  onDone,
  totalCount,
}: {
  questionId: string;
  driveId: string;
  clubSlug: string;
  onDone: () => void;
  totalCount: number;
}) {
  const [state, formAction] = useActionState<DriveResult, FormData>(
    deleteDriveQuestion,
    {},
  );

  React.useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="questionId" value={questionId} />
      <input type="hidden" name="driveId" value={driveId} />
      <input type="hidden" name="__club_slug" value={clubSlug} />

      <h3 className="font-display text-lg font-bold text-ink">
        Delete this question?
      </h3>
      <p className="text-sm text-ink-soft">
        This can&apos;t be undone.
        {totalCount === 1 && (
          <>
            {" "}You&apos;ll have no questions left — you&apos;ll need at least
            one before publishing this drive.
          </>
        )}
      </p>

      {state.error && <p className="text-xs text-clay">{state.error}</p>}

      <div className="flex gap-2">
        <DeleteConfirmBtn />
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-cream"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteConfirmBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-clay px-6 py-2.5 text-sm font-medium text-clay-fg hover:bg-clay/90 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Yes, delete"}
    </button>
  );
}
