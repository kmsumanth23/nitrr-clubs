"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Modal } from "@/components/ui/modal";
import { publishResults, type ReviewResult } from "@/lib/actions/admin-application";

export function PublishResultsButton({
  recruitmentId,
  clubSlug,
  remainingCount,
}: {
  recruitmentId: string;
  clubSlug: string;
  remainingCount: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState<ReviewResult, FormData>(
    publishResults,
    {},
  );
  const blocked = remainingCount > 0;

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      window.location.reload();
    }
  }, [state.ok]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={blocked}
        className="rounded-full bg-indigo px-4 py-2 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:cursor-not-allowed disabled:opacity-50"
        title={
          blocked
            ? `Finish reviewing ${remainingCount} application(s) before publishing`
            : "Publish results to all applicants"
        }
      >
        Publish results
      </button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="recruitmentId" value={recruitmentId} />
          <input type="hidden" name="__club_slug" value={clubSlug} />
          <h3 className="font-display text-lg font-bold text-ink">
            Publish results?
          </h3>
          <p className="text-sm text-ink-soft">
            All applicants will see their results. Accepted students become
            club members immediately. This action cannot be undone.
          </p>
          {state.error && <p className="text-xs text-clay">{state.error}</p>}
          <div className="flex gap-2">
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
      {pending ? "Publishing…" : "Yes, publish"}
    </button>
  );
}
