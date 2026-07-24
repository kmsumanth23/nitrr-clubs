"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  IconAlertTriangle,
  IconRocket,
  IconTrash,
  IconDeviceFloppy,
  IconInfoCircle,
} from "@tabler/icons-react";
import {
  createDrive,
  updateDrive,
  publishDrive,
  deleteDrive,
  updateDriveCommunityLink,
  type DriveResult,
} from "@/lib/actions/drive";
import { useFormStatus } from "react-dom";
import { TargetYearsPicker } from "@/components/admin/target-years-picker";
import { QuestionBuilder } from "@/components/admin/question-builder";
import { Modal } from "@/components/ui/modal";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import { phaseLabel, PHASE_BADGE, type Phase } from "@/lib/phase";
import {
  ROLE_ENUM,
  ROLE_DEFAULT_LABELS,
  roleYearAdvisory,
  type Role,
} from "@/lib/roles";
import type { DriveWithQuestions } from "@/lib/queries/admin-drives";

/**
 * Drive create / edit form.
 *
 * Both modes share the same layout: fields section, (edit-only) questions
 * section, and a single bottom action bar with primary buttons side by side.
 *
 * - Create: [Save as Draft] and [Save & Publish]. Publish requires deadline.
 * - Edit / draft: [Save changes] and [Publish drive]. Publish requires save-first.
 * - Edit / open: [Save changes] only.
 * - Edit / review or result: everything read-only.
 *
 * Question editing on create is intentionally not present — questions have
 * an FK to `recruitments.id`, so the drive has to exist first. On create,
 * `create_drive` auto-populates 3 defaults; user edits them after redirect.
 */
export function DriveEditorForm({
  mode,
  clubId,
  clubSlug,
  drive,
}: {
  mode: "create" | "edit";
  clubId: string;
  clubSlug: string;
  drive?: DriveWithQuestions;
}) {
  const isEdit = mode === "edit" && !!drive;
  const phase: Phase = isEdit ? drive!.phase : "draft";
  // Soft gate: only `result` freezes the drive. Review-phase edits are allowed
  // (main use case: extending the deadline, which rolls the drive back to
  // open). Question CRUD is separately blocked in review via QuestionBuilder,
  // since students have already answered them.
  const readOnly = phase === "result";

  const action = isEdit ? updateDrive : createDrive;
  const [state, formAction, isPending] = useActionState<DriveResult, FormData>(
    action,
    {},
  );

  // Controlled field state
  const [name, setName] = React.useState(drive?.name ?? "");
  const [description, setDescription] = React.useState(drive?.description ?? "");
  const [targetYears, setTargetYears] = React.useState<number[]>(
    drive?.target_years ?? [1, 2, 3, 4],
  );
  const [deadline, setDeadline] = React.useState<string>(
    drive?.deadline ? toLocalInputValue(drive.deadline) : "",
  );
  const [resultDate, setResultDate] = React.useState<string>(
    drive?.result_date ? toLocalInputValue(drive.result_date) : "",
  );
  // 16C: mandatory interview WhatsApp link. Backfilled drives may be null;
  // the banner below warns admins in that case.
  const [interviewLink, setInterviewLink] = React.useState<string>(
    drive?.interview_whatsapp_link ?? "",
  );
  // 17A: optional drive-specific community link. Falls back to club-level
  // link when null. Editable in ALL phases including result via a separate
  // RPC (see ResultPhaseCommunityLinkForm below).
  const [communityLink, setCommunityLink] = React.useState<string>(
    drive?.community_whatsapp_link ?? "",
  );
  // 17B: structural role assigned to accepted applicants + optional custom
  // display label. Snapshotted to `club_members` on publish.
  const [roleOnAccept, setRoleOnAccept] = React.useState<Role>(
    (drive?.role_on_accept as Role) ?? "volunteer",
  );
  const [roleLabel, setRoleLabel] = React.useState<string>(
    drive?.role_label ?? "",
  );

  const [dirty, setDirty] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);

  useUnsavedChanges(dirty && !readOnly);

  // Clear `dirty` on the isPending → false transition (post-submit) when the
  // save succeeded. Watching `state.ok` alone breaks on the 2nd successful
  // save in a row — `state.ok` stays `true` and the effect never re-fires,
  // so `dirty` gets stuck.
  const wasPendingRef = React.useRef(false);
  React.useEffect(() => {
    if (wasPendingRef.current && !isPending && state.ok && !state.error) {
      setDirty(false);
    }
    wasPendingRef.current = isPending;
  });

  const markDirty = () => setDirty(true);

  // datetime-local values in a form serialize as `YYYY-MM-DDTHH:mm` with no
  // timezone. Postgres reads that as UTC by default, so a user typing
  // `23:00` in IST would round-trip to `04:30 next day` on reload. Convert
  // to ISO client-side (which encodes the current tz offset) via a hidden
  // input the form actually submits — the visible input just holds the
  // user's typing.
  const deadlineIso = deadline ? new Date(deadline).toISOString() : "";
  const resultDateIso = resultDate ? new Date(resultDate).toISOString() : "";

  const warnings = computeWarnings({ name, targetYears, deadline, resultDate });

  // Publish requirements — used by both create-mode "Save & Publish" and
  // edit-mode "Publish drive" buttons.
  const questionCount = isEdit ? drive!.questions.length : 3; // create auto-populates 3
  const publishMissing: string[] = [];
  if (!name.trim()) publishMissing.push("name");
  if (targetYears.length === 0) publishMissing.push("target years");
  if (!deadline) publishMissing.push("deadline");
  if (!interviewLink.trim()) publishMissing.push("interview WhatsApp link"); // 16C
  if (isEdit && questionCount === 0) publishMissing.push("at least one question");
  const canPublish = publishMissing.length === 0;

  // 16C: backfill warning — pre-16C drives may have null interview_whatsapp_link.
  // Show a soft banner in edit mode until the field is filled + saved.
  const showBackfillBanner =
    isEdit && !drive?.interview_whatsapp_link && !readOnly;

  return (
    <div className="space-y-6">
      {/* Phase banner (edit mode only) */}
      {isEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${PHASE_BADGE[phase]}`}
            >
              {phaseLabel(phase)}
            </span>
            <span className="text-sm text-ink">{drive!.name}</span>
          </div>
          {phase === "review" && (
            <p className="text-xs text-ink-soft">
              Past the deadline. You can still extend it or edit fields —
              questions are locked (students already answered).
            </p>
          )}
          {readOnly && (
            <p className="text-xs text-ink-soft">
              Results published — this drive is frozen.
            </p>
          )}
        </div>
      )}

      {/* 16C: backfill banner for pre-16C drives with null interview link. */}
      {showBackfillBanner && (
        <div className="flex items-start gap-2 rounded-2xl border border-clay/30 bg-clay/5 p-4 text-sm">
          <IconAlertTriangle
            size={14}
            className="mt-0.5 flex-shrink-0 text-clay"
          />
          <div>
            <p className="font-medium text-clay">Interview link required</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              This drive was created before interview links were required. Add
              one before saving further changes.
            </p>
          </div>
        </div>
      )}

      {/* Form: contains Section 1 (drive fields) only. Submit buttons live
          in the bottom action bar via form="drive-form" attribute. */}
      <form
        id="drive-form"
        action={formAction}
        onChange={markDirty}
        className="space-y-6"
      >
        {/* Common hidden inputs */}
        <input type="hidden" name="__club_slug" value={clubSlug} />
        {isEdit ? (
          <input type="hidden" name="driveId" value={drive!.id} />
        ) : (
          <input type="hidden" name="clubId" value={clubId} />
        )}

        {/* Section 1: The drive */}
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="mb-4 flex items-baseline gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo text-xs font-bold text-indigo-fg">
              1
            </span>
            <h3 className="text-sm font-bold text-ink">The drive</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Drive name <span className="text-clay">*</span>
              </label>
              <input
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={readOnly}
                placeholder="e.g. Autumn 2026 Intake"
                required
                className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo disabled:bg-cream/40 disabled:text-ink-soft"
              />
              <p className="mt-1.5 text-[11px] text-ink-soft">
                Students see this. Name it for the season, batch, or role.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Description
              </label>
              <textarea
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={readOnly}
                rows={2}
                placeholder="Optional context students see on the apply page."
                className="w-full resize-none rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo disabled:bg-cream/40 disabled:text-ink-soft"
              />
            </div>

            {/* 16C: mandatory interview WhatsApp link */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Interview WhatsApp link <span className="text-clay">*</span>
              </label>
              <input
                name="interviewWhatsappLink"
                type="url"
                value={interviewLink}
                onChange={(e) => setInterviewLink(e.target.value)}
                disabled={readOnly}
                placeholder="https://chat.whatsapp.com/..."
                required
                className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo disabled:bg-cream/40 disabled:text-ink-soft"
              />
              <p className="mt-1.5 text-[11px] text-ink-soft">
                Revealed to applicants after they apply — used for interview
                coordination.
              </p>
            </div>

            {/* 17A: drive-specific community WhatsApp link. In Result phase
                the entire form is readOnly and cannot serialize this field
                via the main `update_drive` RPC (which blocks result phase),
                so the standalone editor lives OUTSIDE the main `<form>` —
                see `<ResultPhaseCommunityLinkForm>` rendered below Section 1.
                Nested `<form>` elements are invalid HTML + hydrate-error. */}
            {phase !== "result" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  Community WhatsApp link{" "}
                  <span className="text-[11px] font-normal text-ink-soft">
                    (optional)
                  </span>
                </label>
                <input
                  name="communityWhatsappLink"
                  type="url"
                  value={communityLink}
                  onChange={(e) => setCommunityLink(e.target.value)}
                  disabled={readOnly}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo disabled:bg-cream/40 disabled:text-ink-soft"
                />
                <p className="mt-1.5 text-[11px] text-ink-soft">
                  Revealed to accepted members after publish. Falls back to the
                  club-level community link if empty. Editable even after
                  results are published.
                </p>
              </div>
            )}

            {/* 17B: role assigned on acceptance + optional custom label. */}
            <div className="rounded-2xl border border-line bg-cream/40 p-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Role assigned on acceptance
              </h4>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    Role
                  </label>
                  <select
                    name="roleOnAccept"
                    value={roleOnAccept}
                    onChange={(e) => setRoleOnAccept(e.target.value as Role)}
                    disabled={readOnly}
                    className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo disabled:bg-cream/40"
                  >
                    {ROLE_ENUM.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_DEFAULT_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    Custom label{" "}
                    <span className="text-[11px] font-normal text-ink-soft">
                      (optional)
                    </span>
                  </label>
                  <input
                    name="roleLabel"
                    type="text"
                    value={roleLabel}
                    onChange={(e) => setRoleLabel(e.target.value)}
                    disabled={readOnly}
                    placeholder={`e.g. "Team Captain" (defaults to "${ROLE_DEFAULT_LABELS[roleOnAccept]}")`}
                    maxLength={100}
                    className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo disabled:bg-cream/40"
                  />
                </div>
              </div>

              {/* Year advisory — soft, non-blocking. */}
              {(() => {
                const advisory = roleYearAdvisory(roleOnAccept, targetYears);
                return advisory ? (
                  <p className="mt-2 inline-flex items-start gap-1 text-[11px] text-clay">
                    <IconAlertTriangle size={11} className="mt-0.5" /> {advisory}
                  </p>
                ) : null;
              })()}

              <p className="mt-2 text-[11px] text-ink-soft">
                All students accepted through this drive get this role. The
                custom label overrides the default display name.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink">
                Who can apply? <span className="text-clay">*</span>
              </label>
              <TargetYearsPicker
                value={targetYears}
                onChange={(next) => {
                  setTargetYears(next);
                  markDirty();
                }}
                disabled={readOnly}
              />
              {warnings.seniorRoleMismatch && (
                <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-clay">
                  <IconAlertTriangle size={11} /> {warnings.seniorRoleMismatch}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  Application deadline
                </label>
                {/* Visible input: state-driven local-time editor */}
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  disabled={readOnly}
                  className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo disabled:bg-cream/40"
                />
                {/* Hidden input: what the form actually submits (tz-aware ISO) */}
                <input type="hidden" name="deadline" value={deadlineIso} />
                {warnings.deadlinePast && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-clay">
                    <IconAlertTriangle size={11} /> {warnings.deadlinePast}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  Results by (target)
                </label>
                <input
                  type="datetime-local"
                  value={resultDate}
                  onChange={(e) => setResultDate(e.target.value)}
                  disabled={readOnly}
                  className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo disabled:bg-cream/40"
                />
                <input type="hidden" name="resultDate" value={resultDateIso} />
                {warnings.resultBeforeDeadline && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-clay">
                    <IconAlertTriangle size={11} />{" "}
                    {warnings.resultBeforeDeadline}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 17A: Result-phase community link editor — sibling of the main form,
          not nested inside it. Renders only in result phase; other phases put
          the field inline in Section 1 above. */}
      {phase === "result" && isEdit && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <ResultPhaseCommunityLinkForm
            driveId={drive!.id}
            clubSlug={clubSlug}
            currentLink={communityLink}
            onLinkChange={setCommunityLink}
          />
        </div>
      )}

      {/* Section 2: Application questions */}
      {isEdit ? (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="mb-4 flex items-baseline gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo text-xs font-bold text-indigo-fg">
              2
            </span>
            <h3 className="text-sm font-bold text-ink">Application questions</h3>
            <span className="ml-auto text-xs text-ink-soft">
              {drive!.questions.length}{" "}
              {drive!.questions.length === 1 ? "question" : "questions"}
            </span>
          </div>
          <p className="mb-3 inline-flex items-center gap-1 text-xs text-ink-soft">
            <IconInfoCircle size={12} /> Questions save automatically as you
            edit — no separate save needed for this section.
          </p>
          <QuestionBuilder
            questions={drive!.questions}
            driveId={drive!.id}
            clubSlug={clubSlug}
            phase={phase}
          />
        </div>
      ) : (
        // Create mode: no questions yet, explain the 3-default auto-populate
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo text-xs font-bold text-indigo-fg">
              2
            </span>
            <h3 className="text-sm font-bold text-ink">Application questions</h3>
          </div>
          <p className="inline-flex items-start gap-1.5 text-xs text-ink-soft">
            <IconInfoCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>
              3 default questions will be added automatically (Why join?,
              Relevant experience, What you&apos;ll contribute). You can
              edit, reorder, or add more once the drive is created.
            </span>
          </p>
        </div>
      )}

      {/* Bottom action bar — primary save + publish actions side by side */}
      {!readOnly && (
        <div className="sticky bottom-4 rounded-2xl border border-line bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1 text-xs">
              {dirty && (
                <span className="text-clay">Unsaved drive changes</span>
              )}
              {!dirty && state.ok && (
                <span className="text-sport">Saved.</span>
              )}
              {state.error && (
                <p className="mt-1 text-clay">{state.error}</p>
              )}
              {isEdit && phase === "draft" && !canPublish && (
                <p className="mt-1 inline-flex items-center gap-1 text-clay">
                  <IconAlertTriangle size={11} /> To publish:{" "}
                  {publishMissing.join(", ")}.
                </p>
              )}
              {isEdit && phase === "draft" && canPublish && dirty && (
                <p className="mt-1 inline-flex items-center gap-1 text-ink-soft">
                  <IconInfoCircle size={11} /> Save first, then publish.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* CREATE mode: [Save as Draft] [Save & Publish] */}
              {!isEdit && (
                <>
                  <button
                    type="submit"
                    form="drive-form"
                    name="publishAfter"
                    value="false"
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-medium text-ink hover:bg-cream disabled:opacity-60"
                  >
                    <IconDeviceFloppy size={14} />{" "}
                    {isPending ? "Saving…" : "Save as Draft"}
                  </button>
                  <button
                    type="submit"
                    form="drive-form"
                    name="publishAfter"
                    value="true"
                    disabled={
                      isPending ||
                      !name.trim() ||
                      targetYears.length === 0 ||
                      !deadline ||
                      !interviewLink.trim()
                    }
                    title={
                      !name.trim() ||
                      targetYears.length === 0 ||
                      !deadline ||
                      !interviewLink.trim()
                        ? "To publish immediately: fill name, target years, deadline, and interview WhatsApp link first"
                        : "Save this drive and open applications right away"
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <IconRocket size={14} />{" "}
                    {isPending ? "Publishing…" : "Save & Publish"}
                  </button>
                </>
              )}

              {/* EDIT mode DRAFT: [Save changes] [Publish drive] */}
              {isEdit && phase === "draft" && (
                <>
                  <button
                    type="submit"
                    form="drive-form"
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-medium text-ink hover:bg-cream disabled:opacity-60"
                  >
                    <IconDeviceFloppy size={14} />{" "}
                    {isPending ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishOpen(true)}
                    disabled={!canPublish || dirty}
                    title={
                      dirty
                        ? "Save your changes first"
                        : !canPublish
                          ? `Missing: ${publishMissing.join(", ")}`
                          : "Open this drive for applications"
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <IconRocket size={14} /> Publish drive
                  </button>
                </>
              )}

              {/* EDIT mode OPEN or REVIEW: [Save changes]. Review is a soft
                  gate — leads may extend the deadline (which rolls back to
                  open) or fix typos. */}
              {isEdit && (phase === "open" || phase === "review") && (
                <button
                  type="submit"
                  form="drive-form"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
                >
                  <IconDeviceFloppy size={14} />{" "}
                  {isPending ? "Saving…" : "Save changes"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Publish confirmation (edit mode draft only) */}
      {isEdit && phase === "draft" && (
        <PublishConfirmModal
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          driveId={drive!.id}
          clubSlug={clubSlug}
        />
      )}

      {/* Danger zone (edit mode only, not readonly) */}
      {isEdit && !readOnly && (
        <DangerZone
          driveId={drive!.id}
          driveName={drive!.name}
          clubSlug={clubSlug}
          phase={phase}
          hasApplications={false /* 16B populates this from a real count */}
        />
      )}
    </div>
  );
}

/* ============================= Publish modal ============================= */

function PublishConfirmModal({
  open,
  onClose,
  driveId,
  clubSlug,
}: {
  open: boolean;
  onClose: () => void;
  driveId: string;
  clubSlug: string;
}) {
  const [state, formAction, isPending] = useActionState<DriveResult, FormData>(
    publishDrive,
    {},
  );

  return (
    <Modal open={open} onClose={onClose}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="driveId" value={driveId} />
        <input type="hidden" name="__club_slug" value={clubSlug} />

        <h3 className="font-display text-lg font-bold text-ink">
          Publish this drive?
        </h3>
        <p className="text-sm text-ink-soft">
          Eligible students will see it and start applying immediately. You
          can still edit the deadline, questions, and details until the
          deadline passes — but you can&apos;t un-publish.
        </p>

        {state.error && <p className="text-xs text-clay">{state.error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
          >
            <IconRocket size={14} />{" "}
            {isPending ? "Publishing…" : "Yes, publish"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-cream"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ============================= Danger zone ============================= */

function DangerZone({
  driveId,
  driveName,
  clubSlug,
  phase,
  hasApplications,
}: {
  driveId: string;
  driveName: string;
  clubSlug: string;
  phase: Phase;
  hasApplications: boolean;
}) {
  const [state, formAction, isPending] = useActionState<DriveResult, FormData>(
    deleteDrive,
    {},
  );
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Only draft OR open-with-zero-apps can be deleted
  const canDelete = phase === "draft" || (phase === "open" && !hasApplications);

  return (
    <>
      <div className="rounded-2xl border border-clay/30 bg-clay/5 p-5">
        <div className="mb-2 flex items-baseline gap-2">
          <IconTrash size={14} className="text-clay" />
          <h3 className="text-sm font-bold text-clay">Danger zone</h3>
        </div>
        <p className="mb-3 text-xs text-ink-soft">
          {phase === "draft"
            ? "Deleting removes this draft entirely. Nothing is preserved — treat this as \"never happened.\""
            : phase === "open"
              ? hasApplications
                ? "Cannot delete once applications exist. Withdraw and clear applications first, or wait to review them."
                : "Deleting removes this drive. No applications exist yet, so nothing is lost."
              : "Cannot delete after the deadline passes."}
        </p>
        {state.error && (
          <p className="mb-2 text-xs text-clay">{state.error}</p>
        )}
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!canDelete}
          className="inline-flex items-center gap-1.5 rounded-full bg-clay px-5 py-2 text-sm font-medium text-clay-fg hover:bg-clay/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconTrash size={13} /> Delete{" "}
          {phase === "draft" ? "draft" : "drive"}
        </button>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="driveId" value={driveId} />
          <input type="hidden" name="__club_slug" value={clubSlug} />

          <h3 className="font-display text-lg font-bold text-ink">
            Delete {phase === "draft" ? "draft" : "drive"} &ldquo;{driveName}&rdquo;?
          </h3>
          <p className="text-sm text-ink-soft">
            This can&apos;t be undone. All questions on this drive are also
            deleted.
          </p>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-clay px-6 py-2.5 text-sm font-medium text-clay-fg hover:bg-clay/90 disabled:opacity-60"
            >
              <IconTrash size={13} />{" "}
              {isPending
                ? "Deleting…"
                : phase === "draft"
                  ? "Yes, delete draft"
                  : "Yes, delete drive"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-cream"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ============================= Helpers ============================= */

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Warnings {
  seniorRoleMismatch: string | null;
  deadlinePast: string | null;
  resultBeforeDeadline: string | null;
}

function computeWarnings(input: {
  name: string;
  targetYears: number[];
  deadline: string;
  resultDate: string;
}): Warnings {
  const now = new Date();

  const nameLower = input.name.toLowerCase();
  const isSeniorRole =
    nameLower.includes("lead") ||
    nameLower.includes("head") ||
    nameLower.includes("coordinator");
  const excludesSeniors =
    input.targetYears.length > 0 && !input.targetYears.some((y) => y >= 3);

  const seniorRoleMismatch =
    isSeniorRole && excludesSeniors
      ? "This role typically goes to seniors, but Year 3+ isn't in the audience."
      : null;

  const deadlinePast =
    input.deadline && new Date(input.deadline) < now
      ? "Deadline is in the past — applications won't be accepted."
      : null;

  const resultBeforeDeadline =
    input.deadline &&
    input.resultDate &&
    new Date(input.resultDate) < new Date(input.deadline)
      ? "Result date should be after the deadline."
      : null;

  return { seniorRoleMismatch, deadlinePast, resultBeforeDeadline };
}

/* ============================================================================
 * 17A — Result-phase community link edit
 * ==========================================================================
 * Post-publish, the whole drive is locked EXCEPT the community WhatsApp link
 * (clubs may swap groups after members are added). This mini-form calls the
 * `updateDriveCommunityLink` action which uses a dedicated RPC with no phase
 * gate. Standalone form so it doesn't get sucked into the main drive-form
 * submit which would fail against the result-phase-locked `update_drive` RPC.
 * ========================================================================== */
function ResultPhaseCommunityLinkForm({
  driveId,
  clubSlug,
  currentLink,
  onLinkChange,
}: {
  driveId: string;
  clubSlug: string;
  currentLink: string;
  onLinkChange: (v: string) => void;
}) {
  const [state, formAction] = useActionState<DriveResult, FormData>(
    updateDriveCommunityLink,
    {},
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="driveId" value={driveId} />
      <input type="hidden" name="__club_slug" value={clubSlug} />
      <label className="mb-1.5 block text-sm font-medium text-ink">
        Community WhatsApp link{" "}
        <span className="text-[11px] font-normal text-ink-soft">
          (editable post-publish)
        </span>
      </label>
      <div className="flex gap-2">
        <input
          name="communityWhatsappLink"
          type="url"
          value={currentLink}
          onChange={(e) => onLinkChange(e.target.value)}
          placeholder="https://chat.whatsapp.com/..."
          className="flex-1 rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
        />
        <SaveLinkBtn />
      </div>
      {state.error && (
        <p className="mt-1 text-[11px] text-clay">{state.error}</p>
      )}
      {state.ok && (
        <p className="mt-1 text-[11px] text-sport">Link saved.</p>
      )}
      <p className="mt-1.5 text-[11px] text-ink-soft">
        Members see this link. Other fields on this drive are locked because
        results are published.
      </p>
    </form>
  );
}

function SaveLinkBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-indigo px-4 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}
