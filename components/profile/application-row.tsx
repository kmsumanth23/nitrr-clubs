"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import {
  withdrawApplication,
  editApplication,
} from "@/lib/actions/application";
import { deadlineLabel } from "@/lib/deadline";
import { getPhase, type Phase } from "@/lib/phase";
import type { MyApplication } from "@/lib/queries/profile";
import type { ApplicationStatus } from "@/lib/database.types";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending: "bg-beige text-ink-soft",
  reviewing: "bg-indigo-soft text-indigo",
  accepted: "bg-sport-soft text-sport",
  rejected: "bg-clay-soft text-clay",
  withdrawn: "bg-line text-ink-soft",
  removed: "bg-clay-soft text-clay",
};
const REVIEW_STYLE = "bg-indigo-soft text-indigo";

type Responses = {
  motivation?: string;
  experience?: string;
  contribution?: string;
};

function displayStatus(
  app: MyApplication,
  phase: Phase | null,
): { label: string; style: string } {
  if (app.status === "withdrawn")
    return { label: "Withdrawn", style: STATUS_STYLES.withdrawn };
  if (app.status === "removed")
    return { label: "Removed", style: STATUS_STYLES.removed };
  if (phase === "review")
    return { label: "Under review", style: REVIEW_STYLE };
  const label = app.status.charAt(0).toUpperCase() + app.status.slice(1);
  return { label, style: STATUS_STYLES[app.status] };
}

export function ApplicationRow({ app }: { app: MyApplication }) {
  const [viewOpen, setViewOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const phase = getPhase(app.recruitment);
  const canWithdraw = phase === "open" && app.status === "pending";

  const { label: statusLabel, style: statusStyle } = displayStatus(app, phase);

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="min-w-0">
        <Link
          href={app.club ? `/clubs/${app.club.slug}` : "#"}
          className="block truncate text-sm font-medium text-ink hover:text-indigo"
        >
          {app.club?.name ?? "Club"}
        </Link>
        <div className="mt-0.5 text-xs text-ink-soft">
          {app.recruitment?.name && (
            <>
              {app.recruitment.name} ·{" "}
            </>
          )}
          {deadlineLabel(app.recruitment?.deadline ?? null)}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${statusStyle}`}
        >
          {statusLabel}
        </span>
        <button
          onClick={() => setViewOpen(true)}
          className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-soft hover:border-ink/40 hover:text-ink"
        >
          View
        </button>
        {canWithdraw && (
          <button
            onClick={() => setConfirmOpen(true)}
            className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-soft hover:border-clay hover:text-clay"
          >
            Withdraw
          </button>
        )}
      </div>

      <Modal open={viewOpen} onClose={() => setViewOpen(false)}>
        <ViewEdit app={app} phase={phase} onDone={() => setViewOpen(false)} />
      </Modal>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <WithdrawConfirm
          app={app}
          onCancel={() => setConfirmOpen(false)}
          onDone={() => setConfirmOpen(false)}
        />
      </Modal>
    </li>
  );
}

function ViewEdit({
  app,
  phase,
  onDone,
}: {
  app: MyApplication;
  phase: Phase | null;
  onDone: () => void;
}) {
  const r = (app.responses ?? {}) as Responses;
  const editable = phase === "open" && app.status === "pending";
  const [editing, setEditing] = React.useState(false);
  const [state, formAction] = useActionState(editApplication, {});

  React.useEffect(() => {
    if (state.ok) {
      setEditing(false);
      onDone();
    }
  }, [state.ok, onDone]);

  if (editing) {
    return (
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="applicationId" value={app.id} />
        <h3 className="font-display text-lg font-bold text-ink">Edit application</h3>
        <Q name="motivation" label="Why do you want to join?" defaultValue={r.motivation ?? ""} required />
        <Q name="experience" label="Relevant experience or skills" defaultValue={r.experience ?? ""} />
        <Q name="contribution" label="What can you contribute?" defaultValue={r.contribution ?? ""} required />
        {state.error && <p className="text-center text-xs text-clay">{state.error}</p>}
        <div className="flex gap-2">
          <SaveBtn />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-cream"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-bold text-ink">{app.club?.name ?? "Application"}</h3>
      <Read label="Why do you want to join?" value={r.motivation} />
      <Read label="Relevant experience or skills" value={r.experience} />
      <Read label="What can you contribute?" value={r.contribution} />

      {editable ? (
        <button
          onClick={() => setEditing(true)}
          className="w-full rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90"
        >
          Edit application
        </button>
      ) : (
        <p className="text-center text-xs text-ink-soft">
          {phase === "review"
            ? "Your application is under review and can't be edited."
            : phase === "result"
              ? "Results are out — this application is locked."
              : "This application can no longer be edited."}
        </p>
      )}
    </div>
  );
}

function Read({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{label}</div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{value || "—"}</p>
    </div>
  );
}

function Q({
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">
        {label} {required && <span className="text-clay">*</span>}
      </label>
      <textarea
        name={name}
        rows={3}
        defaultValue={defaultValue}
        required={required}
        className="w-full resize-none rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-indigo"
      />
    </div>
  );
}

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

function WithdrawConfirm({
  app,
  onCancel,
  onDone,
}: {
  app: MyApplication;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(withdrawApplication, {});
  React.useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="applicationId" value={app.id} />
      <h3 className="font-display text-lg font-bold text-ink">Withdraw application?</h3>
      <p className="text-sm text-ink-soft">
        You can re-apply to {app.club?.name ?? "this club"} any time before the deadline.
        After the deadline, the application stays withdrawn and cannot be reopened —
        you may contact the club lead for queries.
      </p>
      {state.error && <p className="text-center text-xs text-clay">{state.error}</p>}
      <div className="flex gap-2">
        <WithdrawBtn />
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-cream"
        >
          Keep it
        </button>
      </div>
    </form>
  );
}

function WithdrawBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-clay px-6 py-2.5 text-sm font-medium text-clay-fg hover:bg-clay/90 disabled:opacity-60"
    >
      {pending ? "Withdrawing…" : "Yes, withdraw"}
    </button>
  );
}
