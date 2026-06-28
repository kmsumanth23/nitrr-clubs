"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Modal } from "@/components/ui/modal";
import { permanentlyDeleteClub } from "@/lib/actions/permanent-delete";

export function PermanentDeleteModal({
  open,
  onClose,
  clubId,
  clubSlug,
  clubName,
}: {
  open: boolean;
  onClose: () => void;
  clubId: string;
  clubSlug: string;
  clubName: string;
}) {
  const router = useRouter();
  const [typed, setTyped] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset state when modal opens/closes (fresh mount via key is cleaner,
  // but this is the simpler local pattern).
  React.useEffect(() => {
    if (!open) {
      setTyped("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const matches = typed.trim() === clubSlug;

  async function handleDelete() {
    if (!matches) return;
    setBusy(true);
    setError(null);
    const result = await permanentlyDeleteClub(clubId, clubSlug);
    if (!result.ok) {
      setBusy(false);
      setError(result.error ?? "Failed.");
      return;
    }
    // Success — close modal and refresh page
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-clay/10 text-clay">
            <IconAlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink">
              Permanently delete{" "}
              <span className="text-clay">{clubName}</span>?
            </h3>
            <p className="mt-1 text-xs text-ink-soft">
              This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-clay/20 bg-clay/5 p-3 text-xs text-ink">
          <p className="mb-2 font-medium">The following will be wiped:</p>
          <ul className="list-disc space-y-0.5 pl-5 text-ink-soft">
            <li>All members in the club roster</li>
            <li>All admin role assignments (leads, managers, editors)</li>
            <li>All events ever created by this club</li>
            <li>All applications submitted to any recruitment</li>
            <li>All recruitment cycles (history included)</li>
            <li>All gallery photos (DB rows + storage files)</li>
            <li>The club page itself</li>
          </ul>
          <p className="mt-2 text-ink-soft">
            User accounts of past members/admins are NOT deleted — only their
            link to this club is removed. The audit log entry for this
            deletion is preserved as a forensic record.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs text-ink-soft">
            Type{" "}
            <code className="rounded bg-cream px-1 py-0.5 font-mono text-[11px] text-ink">
              {clubSlug}
            </code>{" "}
            to confirm.
          </label>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={busy}
            placeholder={clubSlug}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 font-mono text-sm outline-none focus:border-clay disabled:opacity-50"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-clay/30 bg-clay/5 px-3 py-2 text-xs text-clay">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border border-line bg-white px-4 py-1.5 text-sm text-ink hover:border-ink/30 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!matches || busy}
            className="rounded-full bg-clay px-4 py-1.5 text-sm text-white hover:bg-clay/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
