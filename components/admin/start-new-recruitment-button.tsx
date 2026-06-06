"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Modal } from "@/components/ui/modal";
import {
  startNewRecruitment,
  type RecruitmentResult,
} from "@/lib/actions/recruitment";

/**
 * Lead/manager-only — replaces the placeholder banner in the club edit form
 * once the previous recruitment is published. Opens a modal with the
 * new-recruitment fields. The RPC enforces auth + phase gating server-side.
 */
export function StartNewRecruitmentButton({
  clubId,
  clubSlug,
}: {
  clubId: string;
  clubSlug: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState<RecruitmentResult, FormData>(
    startNewRecruitment,
    {},
  );

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      window.location.reload();
    }
  }, [state.ok]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-indigo px-4 py-2 text-sm font-medium text-indigo-fg hover:bg-indigo/90"
      >
        Start new recruitment
      </button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="club_id" value={clubId} />
          <input type="hidden" name="__club_slug" value={clubSlug} />

          <h3 className="font-display text-lg font-bold text-ink">
            Start a new recruitment
          </h3>
          <p className="text-xs text-ink-soft">
            Opens applications for the club. The previous recruitment&apos;s
            applications stay as history.
          </p>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Name (optional)
            </label>
            <input
              name="name"
              maxLength={120}
              placeholder="e.g. Fall 2026 intake"
              className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
            />
            <p className="mt-1 text-[11px] text-ink-soft">
              Defaults to &quot;Recruitment&quot; if blank.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Application deadline
              </label>
              <input
                type="datetime-local"
                name="deadline"
                required
                className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Result date (target)
              </label>
              <input
                type="datetime-local"
                name="result_date"
                required
                className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Interview mode
            </label>
            <select
              name="interview_mode"
              defaultValue=""
              className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
            >
              <option value="">— Not specified —</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Interview WhatsApp link (optional)
            </label>
            <input
              type="url"
              name="interview_whatsapp_link"
              placeholder="https://chat.whatsapp.com/..."
              className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
            />
            <p className="mt-1 text-[11px] text-ink-soft">
              Shown to applicants after the deadline for interview coordination.
              (Reveal happens in step 11.)
            </p>
          </div>

          {state.error && (
            <p className="text-xs text-clay">{state.error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <ConfirmBtn />
            <button
              type="button"
              onClick={() => setOpen(false)}
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

function ConfirmBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      {pending ? "Starting…" : "Start recruitment"}
    </button>
  );
}
