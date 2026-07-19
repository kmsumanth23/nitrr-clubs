"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { IconClock, IconCalendar } from "@tabler/icons-react";
import { Modal } from "@/components/ui/modal";
import { WhatsAppLinkButton } from "@/components/ui/whatsapp-link-popup";
import {
  updateApplication,
  withdrawApplication,
  type ApplicationResult,
} from "@/lib/actions/application";
import { getPhase, type Phase } from "@/lib/phase";
import { targetYearsLabel } from "@/lib/drive-format";
import type { MyApplication } from "@/lib/queries/profile";

/**
 * One row in /profile's "My applications" list.
 * Compact two-line summary. Editing opens a modal so long forms stay isolated
 * from the surrounding list — matches the pre-16B design.
 */
export function ApplicationRow({ app }: { app: MyApplication }) {
  const [editing, setEditing] = React.useState(false);
  const phase = app.recruitment ? getPhase(app.recruitment) : null;
  const questions = app.recruitment?.questions ?? [];
  const responses = (app.responses ?? {}) as Record<string, string>;

  const editable =
    phase === "open" &&
    app.status !== "withdrawn" &&
    app.status !== "removed";

  // 16C: interview link reveal — visible while results aren't published and
  // the student is still in the interview pool (not withdrawn/removed).
  // Correlates with acceptance if it lingered post-publish, so we hide then.
  const interviewLink = app.recruitment?.interview_whatsapp_link ?? null;
  const showInterviewLink =
    !!interviewLink &&
    !app.recruitment?.results_published_at &&
    app.status !== "withdrawn" &&
    app.status !== "removed";

  return (
    <li className="rounded-2xl border border-line bg-white p-5">
      <RowHeader
        app={app}
        phase={phase}
        editable={editable}
        onEdit={() => setEditing(true)}
        showInterviewLink={showInterviewLink}
        interviewLink={interviewLink}
      />
      {editable && (
        <Modal
          open={editing}
          onClose={() => setEditing(false)}
          className="max-w-2xl"
        >
          <EditForm
            app={app}
            questions={questions}
            responses={responses}
            onDone={() => setEditing(false)}
          />
        </Modal>
      )}
    </li>
  );
}

function RowHeader({
  app,
  phase,
  editable,
  onEdit,
  showInterviewLink,
  interviewLink,
}: {
  app: MyApplication;
  phase: Phase | null;
  editable: boolean;
  onEdit: () => void;
  showInterviewLink: boolean;
  interviewLink: string | null;
}) {
  const club = app.club;
  const rec = app.recruitment;

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-lg font-bold text-ink">
          {club?.name ?? "Club"}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-soft">
          {rec?.name && <span className="font-medium">{rec.name}</span>}
          {rec?.target_years && rec.target_years.length > 0 && (
            <span className="rounded-full bg-beige px-2 py-0.5">
              For {targetYearsLabel(rec.target_years)}
            </span>
          )}
          {rec?.deadline && phase === "open" && (
            <span className="inline-flex items-center gap-1">
              <IconClock size={11} /> Closes{" "}
              {new Date(rec.deadline).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
          {rec?.result_date && phase === "review" && (
            <span className="inline-flex items-center gap-1">
              <IconCalendar size={11} /> Results by{" "}
              {new Date(rec.result_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1.5">
        {showInterviewLink && interviewLink && (
          <WhatsAppLinkButton
            url={interviewLink}
            label="Interview WhatsApp group"
          />
        )}
        <StatusPill
          status={app.status}
          resultsPublishedAt={rec?.results_published_at ?? null}
        />
        {editable && (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full bg-indigo px-3 py-1.5 text-xs font-medium text-indigo-fg hover:bg-indigo/90"
            >
              Edit
            </button>
            <WithdrawPill applicationId={app.id} />
          </>
        )}
      </div>
    </div>
  );
}

function StatusPill({
  status,
  resultsPublishedAt,
}: {
  status: string;
  resultsPublishedAt: string | null;
}) {
  // Mask accepted/rejected as "Under review" until results are officially
  // published. Phase-based masking would leak decisions if a lead extends
  // the deadline (review → open round-trip); publication-based masking is
  // stable across those transitions.
  const displayStatus =
    !resultsPublishedAt && (status === "accepted" || status === "rejected")
      ? "reviewing"
      : status;

  const styles: Record<string, string> = {
    pending: "bg-beige text-ink-soft",
    reviewing: "bg-indigo-soft text-indigo",
    accepted: "bg-sport-soft text-sport",
    rejected: "bg-clay-soft text-clay",
    withdrawn: "bg-line text-ink-soft",
    removed: "bg-clay-soft text-clay",
  };

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${styles[displayStatus] ?? "bg-beige text-ink-soft"}`}
    >
      {displayStatus === "reviewing" ? "Under review" : displayStatus}
    </span>
  );
}

function WithdrawPill({ applicationId }: { applicationId: string }) {
  const [state, formAction] = useActionState<ApplicationResult, FormData>(
    withdrawApplication,
    {},
  );
  return (
    <form action={formAction} className="inline-flex items-center">
      <input type="hidden" name="applicationId" value={applicationId} />
      <WithdrawBtn />
      {state.error && (
        <span className="ml-2 text-[10px] text-clay">{state.error}</span>
      )}
    </form>
  );
}

function WithdrawBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-clay/40 bg-white px-3 py-1.5 text-xs font-medium text-clay hover:bg-clay/5 disabled:opacity-60"
    >
      {pending ? "…" : "Withdraw"}
    </button>
  );
}

function EditForm({
  app,
  questions,
  responses,
  onDone,
}: {
  app: MyApplication;
  questions: MyApplication["recruitment"] extends infer R
    ? R extends { questions: infer Q }
      ? Q
      : never
    : never;
  responses: Record<string, string>;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<ApplicationResult, FormData>(
    updateApplication,
    {},
  );

  React.useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  const clubName = app.club?.name ?? "Club";
  const driveName = app.recruitment?.name ?? null;

  return (
    <div>
      <h3 className="mb-1 font-display text-lg font-bold text-ink">
        Edit application
      </h3>
      <p className="mb-5 text-xs text-ink-soft">
        {clubName}
        {driveName && <> · {driveName}</>}
      </p>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="applicationId" value={app.id} />

        {(
          questions as Array<{
            id: string;
            prompt: string;
            sort_order: number;
            question_type: "short_text" | "long_text";
            required: boolean;
          }>
        )
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((q) => (
            <Q
              key={q.id}
              name={`q_${q.id}`}
              label={q.prompt}
              defaultValue={responses[q.id] ?? ""}
              required={q.required}
              isShort={q.question_type === "short_text"}
            />
          ))}

        {state.error && (
          <p className="text-center text-xs text-clay">{state.error}</p>
        )}

        <div className="flex gap-2 pt-2">
          <SaveBtn />
          <button
            type="button"
            onClick={onDone}
            className="rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-cream"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Q({
  name,
  label,
  defaultValue,
  required,
  isShort,
}: {
  name: string;
  label: string;
  defaultValue: string;
  required?: boolean;
  isShort: boolean;
}) {
  const maxLength = isShort ? 250 : 2000;
  return (
    <div>
      <label className="mb-1.5 block whitespace-pre-wrap text-sm font-medium text-ink">
        {label} {required && <span className="text-clay">*</span>}
      </label>
      {isShort ? (
        <input
          type="text"
          name={name}
          defaultValue={defaultValue}
          required={required}
          maxLength={maxLength}
          className="w-full rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-indigo"
        />
      ) : (
        <textarea
          name={name}
          rows={3}
          defaultValue={defaultValue}
          required={required}
          maxLength={maxLength}
          className="w-full resize-none rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-indigo"
        />
      )}
    </div>
  );
}

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}
