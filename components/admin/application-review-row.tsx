"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { IconChevronDown } from "@tabler/icons-react";
import { Modal } from "@/components/ui/modal";
import {
  setApplicationStatus,
  saveApplicationNote,
  type ReviewResult,
} from "@/lib/actions/admin-application";
import type { AdminApplication } from "@/lib/queries/admin-applications";
import type { ApplicationStatus } from "@/lib/database.types";
import type { Phase } from "@/lib/phase";
import type { DriveQuestion } from "@/lib/queries/admin-drives";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending: "bg-beige text-ink-soft",
  reviewing: "bg-indigo-soft text-indigo",
  accepted: "bg-sport-soft text-sport",
  rejected: "bg-clay-soft text-clay",
  withdrawn: "bg-line text-ink-soft",
  removed: "bg-clay-soft text-clay",
};

/**
 * One row in the admin applications review list.
 * Click "View" → modal shows dynamic Q&A based on the drive's questions,
 * status flip UI, and internal note form.
 */
export function ApplicationReviewRow({
  app,
  clubSlug,
  phase,
  questions,
}: {
  app: AdminApplication;
  clubSlug: string;
  phase: Phase;
  questions: DriveQuestion[];
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-ink">
          {app.applicant?.full_name ?? "—"}
        </div>
        <div className="mt-0.5 text-xs text-ink-soft">
          {app.applicant?.roll_number ?? "—"}
          {app.applicant?.year && <> · Year {app.applicant.year}</>}
          {app.applicant?.branch && <> · {app.applicant.branch}</>}
        </div>
        <div className="mt-0.5 text-[11px] text-ink-soft">
          Applied {new Date(app.created_at).toLocaleDateString("en-IN")}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-medium capitalize ${STATUS_STYLES[app.status]}`}
        >
          {app.status}
        </span>
        <button
          onClick={() => setOpen(true)}
          className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-soft hover:border-ink/40 hover:text-ink"
        >
          View
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} className="max-w-2xl">
        <ApplicationDetail
          app={app}
          clubSlug={clubSlug}
          phase={phase}
          questions={questions}
          onClose={() => setOpen(false)}
        />
      </Modal>
    </li>
  );
}

function ApplicationDetail({
  app,
  clubSlug,
  phase,
  questions,
}: {
  app: AdminApplication;
  clubSlug: string;
  phase: Phase;
  questions: DriveQuestion[];
  onClose: () => void;
}) {
  // Responses is now Record<string, string> keyed by question.id (post-16B).
  const responses = (app.responses ?? {}) as Record<string, string>;
  const isFinal =
    app.status === "withdrawn" ||
    app.status === "removed" ||
    phase === "result";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-bold text-ink">
          {app.applicant?.full_name ?? "—"}
        </h3>
        <div className="mt-1 grid grid-cols-2 gap-3 rounded-2xl bg-beige p-4 text-xs text-ink-soft">
          <Snap label="Roll" value={app.applicant?.roll_number ?? null} />
          <Snap label="Email" value={app.applicant?.email ?? null} />
          <Snap
            label="Year"
            value={app.applicant?.year?.toString() ?? null}
          />
          <Snap label="Branch" value={app.applicant?.branch ?? null} />
        </div>
      </div>

      {/* Dynamic Q&A section */}
      <div className="space-y-3">
        {questions
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((q) => (
            <ReadBlock
              key={q.id}
              label={q.prompt}
              value={responses[q.id]}
            />
          ))}
        {questions.length === 0 && (
          <p className="rounded-xl border border-line bg-cream/40 p-3 text-xs text-ink-soft">
            This drive has no questions defined.
          </p>
        )}
      </div>

      {/* Note form */}
      <NoteForm app={app} clubSlug={clubSlug} />

      {/* Decision buttons */}
      {!isFinal && phase === "review" && (
        <StatusFlipRow app={app} clubSlug={clubSlug} />
      )}
      {isFinal && (
        <p className="rounded-xl bg-cream px-4 py-3 text-center text-xs text-ink-soft">
          This application is locked.
        </p>
      )}
    </div>
  );
}

function Snap({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-ink-soft">
        {label}
      </div>
      <div className="mt-0.5 font-medium text-ink">{value || "—"}</div>
    </div>
  );
}

function ReadBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">
        {label}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{value || "—"}</p>
    </div>
  );
}

function StatusFlipRow({
  app,
  clubSlug,
}: {
  app: AdminApplication;
  clubSlug: string;
}) {
  const [state, formAction] = useActionState<ReviewResult, FormData>(
    setApplicationStatus,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="applicationId" value={app.id} />
      <input type="hidden" name="__club_slug" value={clubSlug} />

      <div className="flex gap-2">
        <StatusButton
          value="accepted"
          label="Accept"
          className="bg-sport text-sport-fg hover:bg-sport/90"
          currentStatus={app.status}
        />
        <StatusButton
          value="rejected"
          label="Reject"
          className="bg-clay text-clay-fg hover:bg-clay/90"
          currentStatus={app.status}
        />
        <StatusButton
          value="reviewing"
          label="Mark reviewing"
          className="border border-line bg-white text-ink hover:bg-cream"
          currentStatus={app.status}
        />
      </div>
      {state.error && (
        <p className="text-center text-xs text-clay">{state.error}</p>
      )}
    </form>
  );
}

function StatusButton({
  value,
  label,
  className,
  currentStatus,
}: {
  value: ApplicationStatus;
  label: string;
  className: string;
  currentStatus: ApplicationStatus;
}) {
  const { pending } = useFormStatus();
  const isCurrent = currentStatus === value;
  return (
    <button
      type="submit"
      name="next"
      value={value}
      disabled={pending || isCurrent}
      className={`flex-1 rounded-full px-3 py-2 text-xs font-medium disabled:opacity-50 ${className}`}
    >
      {isCurrent ? "✓ " + label : label}
    </button>
  );
}

function NoteForm({
  app,
  clubSlug,
}: {
  app: AdminApplication;
  clubSlug: string;
}) {
  const [state, formAction] = useActionState<ReviewResult, FormData>(
    saveApplicationNote,
    {},
  );
  const [showHistory, setShowHistory] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const notes = app.notes ?? [];

  // Reset the textarea after a successful save so the next note starts empty.
  React.useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state.ok]);

  return (
    <div className="space-y-3">
      <form action={formAction} ref={formRef}>
        <input type="hidden" name="applicationId" value={app.id} />
        <input type="hidden" name="__club_slug" value={clubSlug} />
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-ink-soft">
          Internal note (not visible to the student)
        </label>
        <textarea
          name="note"
          rows={3}
          placeholder="Add a new note for your co-admins…"
          className="w-full resize-none rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          {state.error && <p className="text-xs text-clay">{state.error}</p>}
          {state.ok && <p className="text-xs text-sport">Note saved.</p>}
          <NoteSave />
        </div>
      </form>

      {notes.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
          >
            <IconChevronDown
              size={12}
              className={`transition-transform ${showHistory ? "rotate-180" : ""}`}
            />
            Previous notes ({notes.length})
          </button>
          {showHistory && (
            <ul className="mt-3 max-h-64 space-y-4 overflow-y-auto border-t border-line pt-3">
              {notes.map((n) => (
                <li key={n.id}>
                  <div className="text-[10px] uppercase tracking-wide text-ink-soft">
                    * Last updated by {n.author?.full_name ?? "Unknown"} on{" "}
                    {new Date(n.created_at).toLocaleDateString("en-IN")}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                    {n.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NoteSave() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-line px-3.5 py-1.5 text-xs text-ink-soft hover:border-ink/40 hover:text-ink disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save note"}
    </button>
  );
}
