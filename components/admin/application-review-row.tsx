"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Modal } from "@/components/ui/modal";
import {
  setApplicationStatus,
  saveApplicationNote,
  type ReviewResult,
} from "@/lib/actions/admin-application";
import type { AdminApplication } from "@/lib/queries/admin-applications";
import type { ApplicationStatus } from "@/lib/database.types";
import type { Phase } from "@/lib/phase";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending: "bg-beige text-ink-soft",
  reviewing: "bg-indigo-soft text-indigo",
  accepted: "bg-sport-soft text-sport",
  rejected: "bg-clay-soft text-clay",
  withdrawn: "bg-line text-ink-soft",
  removed: "bg-clay-soft text-clay",
};

type Responses = {
  motivation?: string;
  experience?: string;
  contribution?: string;
};

export function ApplicationReviewRow({
  app,
  clubSlug,
  phase,
}: {
  app: AdminApplication;
  clubSlug: string;
  phase: Phase;
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

      <Modal open={open} onClose={() => setOpen(false)}>
        <ApplicationDetail
          app={app}
          clubSlug={clubSlug}
          phase={phase}
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
  onClose,
}: {
  app: AdminApplication;
  clubSlug: string;
  phase: Phase;
  onClose: () => void;
}) {
  const r = (app.responses ?? {}) as Responses;
  const isFinal =
    app.status === "withdrawn" ||
    app.status === "removed" ||
    phase === "result";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-bold text-ink">
          {app.applicant?.full_name ?? "Application"}
        </h3>
        <p className="mt-0.5 text-xs text-ink-soft">{app.applicant?.email}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-xl bg-beige p-3 text-xs">
        <Snap label="Roll" value={app.applicant?.roll_number} />
        <Snap label="Year" value={app.applicant?.year?.toString()} />
        <Snap label="Branch" value={app.applicant?.branch} />
      </div>

      <ReadBlock label="Why do you want to join?" value={r.motivation} />
      <ReadBlock label="Relevant experience or skills" value={r.experience} />
      <ReadBlock label="What can you contribute?" value={r.contribution} />

      <NoteForm app={app} clubSlug={clubSlug} />

      <div className="border-t border-line pt-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
          Status
        </div>
        {app.status === "withdrawn" && (
          <p className="text-xs text-ink-soft">
            The student withdrew this application during the open phase.
          </p>
        )}
        {app.status === "removed" && (
          <p className="text-xs text-ink-soft">
            This member was removed from the club. Their application history
            is preserved.
          </p>
        )}
        {!isFinal && phase === "open" && (
          <p className="text-xs text-ink-soft">
            Decisions open after the recruitment deadline. You can read and
            add notes now.
          </p>
        )}
        {!isFinal && phase === "review" && (
          <StatusActions app={app} clubSlug={clubSlug} onDone={onClose} />
        )}
        {phase === "result" && app.status !== "withdrawn" && app.status !== "removed" && (
          <p className="text-xs text-ink-soft">
            Results have been published. This application is locked.
          </p>
        )}
      </div>
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

  const lastUpdated =
    app.note_at && app.note_author?.full_name
      ? `Last updated by ${app.note_author.full_name} on ${new Date(app.note_at).toLocaleDateString("en-IN")}`
      : null;

  return (
    <form action={formAction}>
      <input type="hidden" name="applicationId" value={app.id} />
      <input type="hidden" name="__club_slug" value={clubSlug} />
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-ink-soft">
        Internal note (not visible to the student)
      </label>
      <textarea
        name="note"
        rows={2}
        defaultValue={app.note ?? ""}
        placeholder="Notes for your co-admins…"
        className="w-full resize-none rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-ink-soft">{lastUpdated ?? ""}</span>
        <div className="flex items-center gap-2">
          {state.error && <p className="text-xs text-clay">{state.error}</p>}
          {state.ok && <p className="text-xs text-sport">Note saved.</p>}
          <NoteSave />
        </div>
      </div>
    </form>
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

function StatusActions({
  app,
  clubSlug,
  onDone,
}: {
  app: AdminApplication;
  clubSlug: string;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<ReviewResult, FormData>(
    setApplicationStatus,
    {},
  );

  React.useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  const current = app.status;
  const allowed: ApplicationStatus[] = ["pending", "reviewing", "accepted", "rejected"];
  const others = allowed.filter((s) => s !== current);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="applicationId" value={app.id} />
      <input type="hidden" name="__club_slug" value={clubSlug} />
      <div className="flex flex-wrap gap-2">
        {others.map((s) => (
          <ActionBtn key={s} status={s} />
        ))}
      </div>
      {state.error && (
        <p className="text-center text-xs text-clay">{state.error}</p>
      )}
    </form>
  );
}

function ActionBtn({ status }: { status: ApplicationStatus }) {
  const { pending } = useFormStatus();

  const styles: Record<string, string> = {
    accepted: "bg-sport text-white hover:bg-sport/90",
    rejected: "bg-clay text-clay-fg hover:bg-clay/90",
    reviewing: "bg-indigo text-indigo-fg hover:bg-indigo/90",
    pending: "border border-line bg-white text-ink hover:bg-cream",
  };
  const labels: Record<string, string> = {
    accepted: "Accept",
    rejected: "Reject",
    reviewing: "Mark as reviewing",
    pending: "Revert to pending",
  };

  return (
    <button
      type="submit"
      name="next"
      value={status}
      disabled={pending}
      className={`rounded-full px-4 py-2 text-xs font-medium transition-colors disabled:opacity-60 ${styles[status]}`}
    >
      {pending ? "…" : labels[status]}
    </button>
  );
}
