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
import { PlacementDecisionForm } from "@/components/admin/placement-decision-form";
import type { AdminApplication } from "@/lib/queries/admin-applications";
import type { ApplicationStatus } from "@/lib/database.types";
import type { Phase } from "@/lib/phase";
import type { DriveQuestion } from "@/lib/queries/admin-drives";

/** 17C: minimal drive-department shape for the row's placement affordance. */
interface RowDepartment {
  id: string;
  name: string;
}

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
  departments,
  driveId,
}: {
  app: AdminApplication;
  clubSlug: string;
  phase: Phase;
  questions: DriveQuestion[];
  /** 17C: drive's departments — empty array means the drive has none, so no
   *  placement pill or preferences section renders. */
  departments: RowDepartment[];
  /** 17C: needed by PlacementDecisionForm's hidden inputs for revalidation. */
  driveId: string;
}) {
  const [open, setOpen] = React.useState(false);
  const hasDepartments = departments.length > 0;

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-ink">
          {app.applicant?.full_name ?? "—"}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
          <span>
            {app.applicant?.roll_number ?? "—"}
            {app.applicant?.year && <> · Year {app.applicant.year}</>}
            {app.applicant?.branch && <> · {app.applicant.branch}</>}
          </span>
          {/* 19: applicant_year snapshot mismatch — student's profile year
              changed after they applied. Only renders when values genuinely
              differ (pre-19 backfills equal current year, so silent). */}
          {app.applicant_year != null &&
            app.applicant?.year != null &&
            app.applicant_year !== app.applicant.year && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-clay/10 px-2 py-0.5 text-[10px] font-medium text-clay"
                title={`Applicant was Year ${app.applicant_year} when they applied. Current profile year is ${app.applicant.year}.`}
              >
                ⚠ Applied as Year {app.applicant_year}
              </span>
            )}
        </div>
        <div className="mt-0.5 text-[11px] text-ink-soft">
          Applied {new Date(app.created_at).toLocaleDateString("en-IN")}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-medium capitalize ${STATUS_STYLES[app.status]}`}
        >
          {app.status}
        </span>

        {/* 17C: placement affordance — accepted apps on drives with depts.
            Placement is auto-defaulted on accept (via setApplicationStatus);
            this shows current placement + Change/Assign button and the
            "Placement needed" red badge when null. */}
        {hasDepartments && app.status === "accepted" && (
          <PlacementDecisionForm
            applicationId={app.id}
            driveId={driveId}
            clubSlug={clubSlug}
            departments={departments}
            currentPlacement={app.accepted_department ?? null}
          />
        )}

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
          departments={departments}
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
  departments,
}: {
  app: AdminApplication;
  clubSlug: string;
  phase: Phase;
  questions: DriveQuestion[];
  departments: RowDepartment[];
  onClose: () => void;
}) {
  // Responses is now Record<string, string> keyed by question.id (post-16B).
  const responses = (app.responses ?? {}) as Record<string, string>;
  const isFinal =
    app.status === "withdrawn" ||
    app.status === "removed" ||
    phase === "result";
  const preferences = app.preferred_departments_resolved ?? [];

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
        {/* 19: same mismatch indicator as the row header — surfaced inside
            the modal so admins reviewing an application don't have to scroll
            back to the row to see the year discrepancy. */}
        {app.applicant_year != null &&
          app.applicant?.year != null &&
          app.applicant_year !== app.applicant.year && (
            <div className="mt-2 inline-flex items-start gap-1 rounded-xl border border-clay/30 bg-clay/5 px-3 py-1.5 text-[11px] text-clay">
              <span aria-hidden>⚠</span>
              <span>
                Applied as <strong>Year {app.applicant_year}</strong>. Current
                profile year is <strong>Year {app.applicant.year}</strong>.
              </span>
            </div>
          )}
      </div>

      {/* 17C: ranked department preferences — shown when drive has depts.
          Deleted-dept references are stripped upstream in the query mapper. */}
      {departments.length > 0 && (
        <div className="rounded-xl border border-line bg-cream/40 p-3">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-soft">
            Department preferences
          </div>
          {preferences.length > 0 ? (
            <ol className="list-decimal space-y-0.5 pl-4 text-xs text-ink">
              {preferences.map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-ink-soft">No preferences recorded.</p>
          )}
        </div>
      )}

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
      <div className="whitespace-pre-wrap text-[11px] font-medium uppercase tracking-wide text-ink-soft">
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
