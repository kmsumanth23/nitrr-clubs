"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  IconChevronUp,
  IconChevronDown,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { FaqFormModal } from "@/components/admin/faq-form-modal";
import {
  deleteFaq,
  toggleFaqPublished,
  reorderFaq,
} from "@/lib/actions/faq";
import type { Faq } from "@/lib/database.types";

export function FaqRow({
  faq,
  index,
  isFirst,
  isLast,
}: {
  faq: Faq;
  index: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onToggle() {
    setBusy(true);
    setError(null);
    const result = await toggleFaqPublished(faq.id, !faq.is_published);
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Failed");
    else router.refresh();
  }

  async function onDelete() {
    setBusy(true);
    setError(null);
    const result = await deleteFaq(faq.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Failed");
      setConfirmDelete(false);
    } else {
      router.refresh();
    }
  }

  async function onMove(direction: "up" | "down") {
    setBusy(true);
    setError(null);
    const result = await reorderFaq(faq.id, direction);
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Failed");
    else router.refresh();
  }

  return (
    <>
      <li className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
        {/* Reorder arrows */}
        <div className="flex flex-col gap-0.5 pt-1">
          <button
            type="button"
            onClick={() => onMove("up")}
            disabled={isFirst || busy}
            aria-label="Move up"
            className="rounded p-0.5 text-ink-soft hover:bg-ink/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            <IconChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMove("down")}
            disabled={isLast || busy}
            aria-label="Move down"
            className="rounded p-0.5 text-ink-soft hover:bg-ink/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            <IconChevronDown size={14} />
          </button>
        </div>

        {/* Position */}
        <div className="w-6 pt-1 text-[11px] tabular-nums text-ink-soft">
          {index + 1}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-ink">{faq.question}</div>
          <div className="mt-1 line-clamp-2 text-xs text-ink-soft">
            {faq.answer}
          </div>
          {error && (
            <p className="mt-1 text-xs text-clay">{error}</p>
          )}
        </div>

        {/* Published toggle */}
        <label className="flex flex-shrink-0 items-center gap-1.5 pt-1 text-[11px] text-ink-soft">
          <input
            type="checkbox"
            checked={faq.is_published}
            onChange={onToggle}
            disabled={busy}
            className="h-3.5 w-3.5 rounded border-line accent-indigo"
          />
          Published
        </label>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-1 pt-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={busy}
            aria-label="Edit"
            className="rounded-full p-1.5 text-ink-soft hover:bg-ink/5 hover:text-ink"
          >
            <IconPencil size={14} />
          </button>
          {confirmDelete ? (
            <>
              <button
                type="button"
                onClick={onDelete}
                disabled={busy}
                className="rounded-full bg-clay px-2 py-0.5 text-[11px] text-white hover:bg-clay/90"
              >
                {busy ? "…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
                className="rounded-full border border-line bg-white px-2 py-0.5 text-[11px] text-ink-soft hover:border-ink/30"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              aria-label="Delete"
              className="rounded-full p-1.5 text-ink-soft hover:bg-clay/10 hover:text-clay"
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>
      </li>

      <FaqFormModal
        open={editing}
        onOpenChange={(next) => {
          setEditing(next);
          if (!next) router.refresh();
        }}
        existing={faq}
      />
    </>
  );
}
