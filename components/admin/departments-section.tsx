"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  IconPlus,
  IconInfoCircle,
  IconLock,
} from "@tabler/icons-react";
import { DepartmentRow } from "@/components/admin/department-row";
import {
  addDriveDepartment,
  updateDriveDepartment,
  deleteDriveDepartment,
  swapDriveDepartmentOrder,
  updateDrive,
  type DriveResult,
} from "@/lib/actions/drive";
import type { DriveDepartment } from "@/lib/queries/admin-drives";
import type { Phase } from "@/lib/phase";

/**
 * Departments section for the drive editor. Renders the max_department_choices
 * picker + the department list + "Add department" affordance.
 *
 * Phase gating (Q5 → C):
 *   Draft:  add / edit name / edit link / delete / reorder — all allowed
 *   Open+Review: name + link edits only; add/delete/reorder disabled with tooltip
 *   Result: name + link edits allowed via dedicated form; add/delete/reorder hidden
 */
export function DepartmentsSection({
  driveId,
  clubSlug,
  departments,
  maxDepartmentChoices,
  phase,
}: {
  driveId: string;
  clubSlug: string;
  departments: DriveDepartment[];
  maxDepartmentChoices: number;
  phase: Phase;
}) {
  const isDraft = phase === "draft";
  const isResult = phase === "result";

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-4 flex items-baseline gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo text-xs font-bold text-indigo-fg">
          3
        </span>
        <h3 className="text-sm font-bold text-ink">Departments</h3>
        <span className="ml-auto text-xs text-ink-soft">
          {departments.length}{" "}
          {departments.length === 1 ? "department" : "departments"}
          {!isDraft && (
            <span className="ml-2 inline-flex items-center gap-1 text-clay">
              <IconLock size={11} /> Structure locked
            </span>
          )}
        </span>
      </div>

      <p className="mb-4 inline-flex items-start gap-1.5 text-xs text-ink-soft">
        <IconInfoCircle size={14} className="mt-0.5 flex-shrink-0" />
        <span>
          Optional. If you define departments, applicants rank their preferences
          when applying, and admins decide placement at accept time.
        </span>
      </p>

      {/* Max choices picker — always visible, disabled outside draft */}
      <MaxChoicesPicker
        driveId={driveId}
        clubSlug={clubSlug}
        currentValue={maxDepartmentChoices}
        disabled={!isDraft}
      />

      {/* Department list */}
      {departments.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {departments.map((dept, idx) => (
            <DepartmentRow
              key={dept.id}
              department={dept}
              driveId={driveId}
              clubSlug={clubSlug}
              canReorderUp={isDraft && idx > 0}
              canReorderDown={isDraft && idx < departments.length - 1}
              canDelete={isDraft}
              prevId={idx > 0 ? departments[idx - 1].id : null}
              nextId={
                idx < departments.length - 1 ? departments[idx + 1].id : null
              }
              isResult={isResult}
              onUpdate={updateDriveDepartment}
              onDelete={deleteDriveDepartment}
              onSwap={swapDriveDepartmentOrder}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-line bg-cream/40 p-4 text-center text-xs text-ink-soft">
          {isDraft
            ? "No departments defined. Click below to add one — students will rank their preferences at apply time."
            : "This drive has no departments."}
        </p>
      )}

      {/* Add form — draft only */}
      {isDraft && (
        <div className="mt-4">
          <AddDepartmentForm driveId={driveId} clubSlug={clubSlug} />
        </div>
      )}

      {!isDraft && !isResult && (
        <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-ink-soft">
          <IconLock size={11} />
          Adding, deleting, or reordering departments is locked after publish.
          You can still edit names and community links above.
        </p>
      )}
    </div>
  );
}

/* ============================= Max choices picker ============================= */

function MaxChoicesPicker({
  driveId,
  clubSlug,
  currentValue,
  disabled,
}: {
  driveId: string;
  clubSlug: string;
  currentValue: number;
  disabled: boolean;
}) {
  const [value, setValue] = React.useState(currentValue);
  const [state, formAction] = useActionState<DriveResult, FormData>(
    updateDrive,
    {},
  );

  React.useEffect(() => {
    setValue(currentValue);
  }, [currentValue]);

  // Auto-save on change; wraps updateDrive with only the max_department_choices
  // field so other fields are preserved (17B addendum 1 pattern preserves null).
  function handleChange(newVal: number) {
    setValue(newVal);
    const form = document.getElementById("drive-form") as HTMLFormElement | null;
    if (!form) return;
    // Sync the hidden input, main form save handles the rest on next submit.
    const input = form.querySelector<HTMLInputElement>(
      "input[name='maxDepartmentChoices']",
    );
    if (input) input.value = String(newVal);
  }

  return (
    <div className="rounded-xl border border-line bg-cream/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium text-ink" htmlFor="maxDeptChoices">
          How many departments can students rank?
        </label>
        <select
          id="maxDeptChoices"
          value={value}
          onChange={(e) => handleChange(Number(e.target.value))}
          disabled={disabled}
          className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-ink outline-none focus:border-indigo disabled:cursor-not-allowed disabled:bg-cream/40 disabled:text-ink-soft"
          title={disabled ? "Locked after publish" : undefined}
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "choice" : "choices"}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-1.5 text-[11px] text-ink-soft">
        Applicants pick up to this many departments in rank order (1st, 2nd,
        ...). Saved with the main drive form.
      </p>
    </div>
  );
}

/* ============================= Add department form ============================= */

function AddDepartmentForm({
  driveId,
  clubSlug,
}: {
  driveId: string;
  clubSlug: string;
}) {
  const [state, formAction, isPending] = useActionState<DriveResult, FormData>(
    addDriveDepartment,
    {},
  );
  const [name, setName] = React.useState("");
  const [link, setLink] = React.useState("");
  const formRef = React.useRef<HTMLFormElement>(null);

  // Lesson 20: `state.ok` is sticky across successive successful dispatches —
  // a `[state.ok]` dep only fires on the first success, so subsequent adds
  // leave the previous name/link in the inputs. Watch the isPending → false
  // transition instead so the form clears after every successful add.
  const wasPendingRef = React.useRef(false);
  React.useEffect(() => {
    if (wasPendingRef.current && !isPending && state.ok && !state.error) {
      setName("");
      setLink("");
      formRef.current?.reset();
    }
    wasPendingRef.current = isPending;
  });

  return (
    <form action={formAction} ref={formRef} className="space-y-2">
      <input type="hidden" name="driveId" value={driveId} />
      <input type="hidden" name="__club_slug" value={clubSlug} />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Department name (e.g., Event Management)"
          required
          maxLength={100}
          className="rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
        />
        <input
          type="url"
          name="communityWhatsappLink"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Optional WhatsApp group link"
          className="rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
        />
        <AddBtn disabled={!name.trim()} />
      </div>

      {state.error && <p className="text-xs text-clay">{state.error}</p>}
    </form>
  );
}

function AddBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center gap-1.5 rounded-full bg-indigo px-4 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      <IconPlus size={13} />
      {pending ? "Adding…" : "Add"}
    </button>
  );
}
