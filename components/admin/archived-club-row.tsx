"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Modal } from "@/components/ui/modal";
import { restoreClub, type SysadminResult } from "@/lib/actions/sysadmin";
import type { ArchivedClub } from "@/lib/queries/sysadmin";
import { PermanentDeleteModal } from "@/components/admin/permanent-delete-modal";

export function ArchivedClubRow({ club }: { club: ArchivedClub }) {
  const [restoreOpen, setRestoreOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-ink">{club.name}</div>
        <div className="mt-0.5 text-xs text-ink-soft">
          /{club.slug} · Decommissioned{" "}
          {new Date(club.archived_at).toLocaleDateString("en-IN")}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setRestoreOpen(true)}
          className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-soft hover:border-indigo hover:text-indigo"
        >
          Restore
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="rounded-full border border-clay/40 bg-white px-3 py-1 text-[11px] text-clay hover:bg-clay/5"
        >
          Delete permanently
        </button>
      </div>

      <Modal open={restoreOpen} onClose={() => setRestoreOpen(false)}>
        <RestoreConfirm
          club={club}
          onCancel={() => setRestoreOpen(false)}
        />
      </Modal>

      <PermanentDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        clubId={club.id}
        clubSlug={club.slug}
        clubName={club.name}
      />
    </li>
  );
}

function RestoreConfirm({
  club,
  onCancel,
}: {
  club: ArchivedClub;
  onCancel: () => void;
}) {
  const [state, formAction] = useActionState<SysadminResult, FormData>(
    restoreClub,
    {},
  );

  React.useEffect(() => {
    if (state.ok) {
      onCancel();
      window.location.reload();
    }
  }, [state.ok, onCancel]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clubId" value={club.id} />

      <h3 className="font-display text-lg font-bold text-ink">
        Restore {club.name}?
      </h3>
      <p className="text-sm text-ink-soft">
        The club becomes visible on the public site again. Its data (members,
        events, gallery, recruitments) is untouched.
      </p>

      {state.error && <p className="text-xs text-clay">{state.error}</p>}

      <div className="flex gap-2">
        <ConfirmBtn />
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

function ConfirmBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      {pending ? "Restoring…" : "Yes, restore"}
    </button>
  );
}
