"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  IconChevronUp,
  IconChevronDown,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { CategoryFormModal } from "@/components/admin/category-form-modal";
import { deleteCategory, reorderCategory } from "@/lib/actions/category";
import type { CategoryWithUsage } from "@/lib/queries/categories-admin";

export function CategoryRow({
  category,
  isFirst,
  isLast,
}: {
  category: CategoryWithUsage;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [editKey, setEditKey] = React.useState(0);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Stable callback + key bump — see faq-list.tsx for the rationale.
  const handleEditingChange = React.useCallback(
    (next: boolean) => {
      setEditing(next);
      if (!next) {
        setEditKey((k) => k + 1);
        router.refresh();
      }
    },
    [router],
  );

  async function onDelete() {
    setBusy(true);
    setError(null);
    const result = await deleteCategory(category.id);
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
    const result = await reorderCategory(category.id, direction);
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Failed");
    else router.refresh();
  }

  return (
    <>
      <li className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
        <div className="flex flex-col gap-0.5">
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

        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-ink">{category.name}</div>
          <div className="mt-0.5 font-mono text-[11px] text-ink-soft">
            /{category.slug}
          </div>
          {error && <p className="mt-1 text-xs text-clay">{error}</p>}
        </div>

        <div className="flex-shrink-0 rounded-full bg-cream px-2 py-0.5 text-[11px] text-ink-soft">
          {category.club_count} club{category.club_count === 1 ? "" : "s"}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1">
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

      <CategoryFormModal
        key={editKey}
        open={editing}
        onOpenChange={handleEditingChange}
        existing={{
          id: category.id,
          name: category.name,
          slug: category.slug,
        }}
      />
    </>
  );
}
