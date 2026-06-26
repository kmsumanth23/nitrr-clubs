"use client";

import * as React from "react";
import { useActionState } from "react";
import { Modal } from "@/components/ui/modal";
import { createFaq, updateFaq } from "@/lib/actions/faq";
import type { Faq } from "@/lib/database.types";

interface ActionResult {
  ok: boolean;
  error?: string;
}

const INITIAL: ActionResult = { ok: false };

export function FaqFormModal({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  existing?: Faq;
}) {
  const isEdit = !!existing;
  const action = isEdit
    ? updateFaq.bind(null, existing!.id)
    : createFaq;

  const [state, formAction, pending] = useActionState(action, INITIAL);

  React.useEffect(() => {
    if (state.ok) {
      onOpenChange(false);
    }
  }, [state.ok, onOpenChange]);

  return (
    <Modal open={open} onClose={() => onOpenChange(false)}>
      <h3 className="mb-4 font-display text-lg font-bold text-ink">
        {isEdit ? "Edit FAQ" : "Add FAQ"}
      </h3>
      <form action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">
            Question
          </label>
          <input
            type="text"
            name="question"
            required
            defaultValue={existing?.question}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-indigo"
            placeholder="How do I apply to a club?"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">
            Answer
          </label>
          <textarea
            name="answer"
            required
            defaultValue={existing?.answer}
            rows={5}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-indigo"
            placeholder="Click the Apply button on any club page during their recruitment window…"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={existing?.is_published ?? true}
            className="h-4 w-4 rounded border-line accent-indigo"
          />
          Published (visible on public site)
        </label>

        {state.error && (
          <p className="rounded-lg border border-clay/30 bg-clay/5 px-3 py-2 text-xs text-clay">
            {state.error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-line bg-white px-4 py-1.5 text-sm text-ink hover:border-ink/30"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-indigo px-4 py-1.5 text-sm text-indigo-fg hover:bg-indigo/90 disabled:opacity-50"
          >
            {pending ? "Saving…" : isEdit ? "Save" : "Add FAQ"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
