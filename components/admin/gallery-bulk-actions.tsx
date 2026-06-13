"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Modal } from "@/components/ui/modal";
import { deletePhotos, type GalleryResult } from "@/lib/actions/gallery";

export function GalleryBulkActions({
  selectedIds,
  clubSlug,
  onClear,
}: {
  selectedIds: string[];
  clubSlug: string;
  onClear: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState<GalleryResult, FormData>(
    deletePhotos,
    {},
  );

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      onClear();
      window.location.reload();
    }
  }, [state.ok, onClear]);

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="sticky bottom-4 z-30 mx-auto flex w-fit items-center gap-3 rounded-full border border-line bg-white px-4 py-2 shadow-soft">
        <span className="text-xs text-ink">
          {selectedIds.length} selected
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-ink-soft hover:text-ink"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-clay px-3 py-1 text-xs font-medium text-clay-fg hover:bg-clay/90"
        >
          Delete
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="photoIds" value={selectedIds.join(",")} />
          <input type="hidden" name="__club_slug" value={clubSlug} />
          <h3 className="font-display text-lg font-bold text-ink">
            Delete {selectedIds.length} photo{selectedIds.length === 1 ? "" : "s"}?
          </h3>
          <p className="text-sm text-ink-soft">
            This permanently removes the photos from the club gallery and the
            storage bucket. Cannot be undone.
          </p>
          {state.error && <p className="text-xs text-clay">{state.error}</p>}
          <div className="flex gap-2">
            <DeleteBtn />
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
