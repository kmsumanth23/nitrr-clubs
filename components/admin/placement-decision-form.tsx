"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { IconEdit, IconCheck, IconX } from "@tabler/icons-react";
import { Modal } from "@/components/ui/modal";
import {
  setAcceptedDepartment,
  type ReviewResult,
} from "@/lib/actions/admin-application";

interface Department {
  id: string;
  name: string;
}

/**
 * Admin placement decision mini-form.
 *
 * Renders as a small "Placed: X" pill with a Change button. Click opens a
 * modal with a dropdown of all drive departments. Uses set_accepted_department
 * RPC (all phases, including result — post-publish placement corrections
 * are the point of this affordance).
 */
export function PlacementDecisionForm({
  applicationId,
  driveId,
  clubSlug,
  departments,
  currentPlacement,
}: {
  applicationId: string;
  driveId: string;
  clubSlug: string;
  departments: Department[];
  currentPlacement: { id: string; name: string } | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string>(
    currentPlacement?.id ?? "",
  );

  const [state, formAction] = useActionState<ReviewResult, FormData>(
    setAcceptedDepartment,
    {},
  );

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
    }
  }, [state.ok]);

  React.useEffect(() => {
    setSelectedId(currentPlacement?.id ?? "");
  }, [currentPlacement]);

  return (
    <div className="inline-flex items-center gap-2">
      {currentPlacement ? (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-indigo-soft px-2.5 py-0.5 text-[11px] font-medium text-indigo"
          title="Current department placement"
        >
          Placed: {currentPlacement.name}
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-clay/10 px-2.5 py-0.5 text-[11px] font-medium text-clay"
          title="Accepted but no department assigned. Assign one before publish."
        >
          Placement needed
        </span>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-soft hover:border-ink/40 hover:text-ink"
      >
        <IconEdit size={10} />
        {currentPlacement ? "Change" : "Assign"}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} className="max-w-sm">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="driveId" value={driveId} />
          <input type="hidden" name="__club_slug" value={clubSlug} />

          <div>
            <h3 className="font-display text-lg font-bold text-ink">
              {currentPlacement ? "Change placement" : "Assign department"}
            </h3>
            <p className="mt-1 text-xs text-ink-soft">
              Choose the department for this member. You can pick any department
              — student preferences are guidance, not a hard constraint.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Department
            </label>
            <select
              name="departmentId"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
              required
            >
              <option value="">— Select department —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {state.error && <p className="text-xs text-clay">{state.error}</p>}

          <div className="flex gap-2 pt-2">
            <ConfirmBtn disabled={!selectedId} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 rounded-full border border-line px-4 py-2.5 text-sm text-ink hover:bg-cream"
            >
              <IconX size={13} /> Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ConfirmBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center gap-1 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      <IconCheck size={13} />
      {pending ? "Saving…" : "Confirm"}
    </button>
  );
}
