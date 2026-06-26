"use client";

import * as React from "react";
import { useActionState } from "react";
import { Modal } from "@/components/ui/modal";
import { createCategory, updateCategory } from "@/lib/actions/category";
import { slugify } from "@/lib/validation/category";

interface ActionResult {
  ok: boolean;
  error?: string;
}

const INITIAL: ActionResult = { ok: false };

interface ExistingCategory {
  id: string;
  name: string;
  slug: string;
}

export function CategoryFormModal({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  existing?: ExistingCategory;
}) {
  const isEdit = !!existing;
  const action = isEdit
    ? updateCategory.bind(null, existing!.id)
    : createCategory;

  const [state, formAction, pending] = useActionState(action, INITIAL);

  // Slug auto-fill while typing name (only when slug is empty or matches the
  // slugified previous name)
  const [name, setName] = React.useState(existing?.name ?? "");
  const [slug, setSlug] = React.useState(existing?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(false);

  React.useEffect(() => {
    if (!slugTouched && !isEdit) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched, isEdit]);

  React.useEffect(() => {
    if (state.ok) {
      onOpenChange(false);
    }
  }, [state.ok, onOpenChange]);

  return (
    <Modal open={open} onClose={() => onOpenChange(false)}>
      <h3 className="mb-4 font-display text-lg font-bold text-ink">
        {isEdit ? "Edit category" : "Add category"}
      </h3>
      <form action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">
            Name
          </label>
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-indigo"
            placeholder="Tech & Robotics"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">
            Slug{" "}
            <span className="text-[10px] font-normal text-ink-soft">
              (URL-safe, lowercase, hyphens)
            </span>
          </label>
          <input
            type="text"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            required
            className="w-full rounded-xl border border-line bg-white px-3 py-2 font-mono text-sm outline-none focus:border-indigo"
            placeholder="tech-robotics"
          />
          {isEdit && existing && slug !== existing.slug && (
            <p className="mt-1 text-[11px] text-clay">
              Changing the slug is safe — clubs are linked by id, not slug.
            </p>
          )}
        </div>

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
            {pending ? "Saving…" : isEdit ? "Save" : "Add category"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
