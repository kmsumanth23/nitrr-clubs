"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { deleteEvent } from "@/lib/actions/event";
import type { EventRow } from "@/lib/database.types";

function fmt(iso: string | null): string {
  if (!iso) return "TBA";
  return new Date(iso).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EventAdminRow({
  ev,
  clubSlug,
  past,
}: {
  ev: EventRow;
  clubSlug: string;
  past?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 ${past ? "opacity-75" : ""}`}
    >
      <div className="min-w-0">
        <Link
          href={`/events/${ev.slug}`}
          target="_blank"
          className="block truncate text-sm font-medium text-ink hover:text-indigo"
        >
          {ev.title}
        </Link>
        <div className="mt-0.5 text-xs text-ink-soft">
          {fmt(ev.starts_at)}
          {ev.venue && <> · {ev.venue}</>}
          {past && (
            <span className="ml-2 rounded-full bg-beige px-2 py-0.5 text-[10px] text-ink-soft">
              Past
            </span>
          )}
          {!ev.reg_open && (
            <span className="ml-2 rounded-full bg-beige px-2 py-0.5 text-[10px] text-ink-soft">
              Reg closed
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/admin/clubs/${clubSlug}/events/${ev.id}/edit`}
          className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-soft hover:border-ink/40 hover:text-ink"
        >
          Edit
        </Link>
        <button
          onClick={() => setConfirmOpen(true)}
          className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-soft hover:border-clay hover:text-clay"
        >
          Delete
        </button>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DeleteConfirm
          ev={ev}
          clubSlug={clubSlug}
          onCancel={() => setConfirmOpen(false)}
        />
      </Modal>
    </li>
  );
}

function DeleteConfirm({
  ev,
  clubSlug,
  onCancel,
}: {
  ev: EventRow;
  clubSlug: string;
  onCancel: () => void;
}) {
  const [state, formAction] = useActionState(deleteEvent, {});

  React.useEffect(() => {
    if (state.ok) {
      onCancel();
      // page revalidates from the action; full refresh ensures the row is gone
      window.location.reload();
    }
  }, [state.ok, onCancel]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={ev.id} />
      <input type="hidden" name="club_id" value={ev.club_id} />
      <input type="hidden" name="__club_slug" value={clubSlug} />
      <h3 className="font-display text-lg font-bold text-ink">
        Delete this event?
      </h3>
      <p className="text-sm text-ink-soft">
        <span className="font-medium text-ink">{ev.title}</span> will be removed
        from the public site. Photos in the gallery linked to this event will be
        kept but un-linked.
      </p>
      {state.error && <p className="text-center text-xs text-clay">{state.error}</p>}
      <div className="flex gap-2">
        <DeleteBtn />
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-cream"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-clay px-6 py-2.5 text-sm font-medium text-clay-fg hover:bg-clay/90 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Yes, delete"}
    </button>
  );
}
