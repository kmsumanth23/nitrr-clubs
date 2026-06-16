"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateRecruitment,
  type ClubEditResult,
} from "@/lib/actions/club";
import { StartNewRecruitmentButton } from "@/components/admin/start-new-recruitment-button";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import { getPhase, phaseLabel, PHASE_BADGE } from "@/lib/phase";

interface RecruitmentRow {
  id: string;
  name: string | null;
  deadline: string | null;
  result_date: string | null;
  results_published_at: string | null;
}

export function RecruitmentSection({
  clubId,
  clubSlug,
  isRecruiting,
  currentRecruitment,
}: {
  clubId: string;
  clubSlug: string;
  isRecruiting: boolean;
  currentRecruitment: RecruitmentRow | null;
}) {
  const [state, formAction] = useActionState<ClubEditResult, FormData>(
    updateRecruitment,
    {},
  );
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    if (state.ok) setDirty(false);
  }, [state.ok]);

  useUnsavedChanges(dirty);

  const phase = currentRecruitment ? getPhase(currentRecruitment) : null;
  const published = !!currentRecruitment?.results_published_at;
  const noRecruitment = !currentRecruitment;

  const deadlineDefault = currentRecruitment?.deadline
    ? toLocalInputValue(currentRecruitment.deadline)
    : "";
  const resultDefault = currentRecruitment?.result_date
    ? toLocalInputValue(currentRecruitment.result_date)
    : "";

  return (
    <div className="space-y-6">
      {/* Phase / state banner */}
      {phase && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${PHASE_BADGE[phase]}`}
              >
                {phaseLabel(phase)}
              </span>
              {currentRecruitment?.name && (
                <span className="text-sm font-medium text-ink">
                  {currentRecruitment.name}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              {phase === "open" && "Students are applying. You can edit deadline and result date until the deadline passes."}
              {phase === "review" && "Past the deadline. Admins are deciding. Lead can publish from the Applications page."}
              {phase === "result" && "Results were published. Start a new recruitment to begin a fresh cycle."}
            </p>
          </div>
          {published && (
            <StartNewRecruitmentButton clubId={clubId} clubSlug={clubSlug} />
          )}
        </div>
      )}

      {noRecruitment && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
          <p className="flex-1 text-xs text-ink-soft">
            No recruitment opened yet. Start one to begin accepting applications
            from students.
          </p>
          <StartNewRecruitmentButton clubId={clubId} clubSlug={clubSlug} />
        </div>
      )}

      {/* Editable form (visible when there's a non-published recruitment) */}
      {currentRecruitment && !published && (
        <form
          action={formAction}
          onChange={() => setDirty(true)}
          className="space-y-6"
        >
          <input type="hidden" name="clubId" value={clubId} />

          <div className="rounded-2xl border border-line bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-ink">Public visibility</h3>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="is_recruiting"
                defaultChecked={isRecruiting}
                className="h-4 w-4 rounded border-line accent-indigo"
              />
              Show as recruiting on public pages
            </label>
            <p className="mt-1.5 text-[11px] text-ink-soft">
              When on, the public club page shows a &quot;Recruiting&quot; badge
              and the Apply button is enabled.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-ink">Current recruitment</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  Application deadline
                </label>
                <input
                  type="datetime-local"
                  name="recruitment_deadline"
                  defaultValue={deadlineDefault}
                  className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
                />
                <p className="mt-1.5 text-[11px] text-ink-soft">
                  Students can apply, edit, and withdraw until this time.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  Result date (target)
                </label>
                <input
                  type="datetime-local"
                  name="result_date"
                  defaultValue={resultDefault}
                  className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
                />
                <p className="mt-1.5 text-[11px] text-ink-soft">
                  Promised date for results. Used for overdue anomaly checks.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-ink-soft">
              {dirty && <span className="text-clay">Unsaved changes</span>}
            </span>
            <div className="flex items-center gap-3">
              {state.error && <p className="text-xs text-clay">{state.error}</p>}
              {state.ok && !dirty && <p className="text-xs text-sport">Saved.</p>}
              <SaveButton />
            </div>
          </div>
        </form>
      )}

      {/* Published recruitment: read-only summary + is_recruiting toggle */}
      {currentRecruitment && published && (
        <form
          action={formAction}
          onChange={() => setDirty(true)}
          className="space-y-6"
        >
          <input type="hidden" name="clubId" value={clubId} />

          <div className="rounded-2xl border border-line bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-ink">Public visibility</h3>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="is_recruiting"
                defaultChecked={isRecruiting}
                className="h-4 w-4 rounded border-line accent-indigo"
              />
              Show as recruiting on public pages
            </label>
            <p className="mt-1.5 text-[11px] text-ink-soft">
              Usually turned off after results are published; turned on when
              you start a new recruitment.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-ink">Last recruitment</h3>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Field
                label="Deadline"
                value={
                  currentRecruitment.deadline
                    ? new Date(currentRecruitment.deadline).toLocaleString("en-IN")
                    : "—"
                }
              />
              <Field
                label="Result date"
                value={
                  currentRecruitment.result_date
                    ? new Date(currentRecruitment.result_date).toLocaleString("en-IN")
                    : "—"
                }
              />
              <Field
                label="Published"
                value={
                  currentRecruitment.results_published_at
                    ? new Date(currentRecruitment.results_published_at).toLocaleString("en-IN")
                    : "—"
                }
              />
            </dl>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-ink-soft">
              {dirty && <span className="text-clay">Unsaved changes</span>}
            </span>
            <div className="flex items-center gap-3">
              {state.error && <p className="text-xs text-clay">{state.error}</p>}
              {state.ok && !dirty && <p className="text-xs text-sport">Saved.</p>}
              <SaveButton />
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function SaveButton() {
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
