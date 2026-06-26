"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { CategoryRow } from "@/components/admin/category-row";
import { CategoryFormModal } from "@/components/admin/category-form-modal";
import type { CategoryWithUsage } from "@/lib/queries/categories-admin";

export function CategoryList({
  categories,
}: {
  categories: CategoryWithUsage[];
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);

  const totalClubs = categories.reduce((s, c) => s + c.club_count, 0);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-soft">
          {categories.length} categor{categories.length === 1 ? "y" : "ies"}
          {" · "}
          {totalClubs} active club{totalClubs === 1 ? "" : "s"} assigned
        </p>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo px-3.5 py-1.5 text-xs text-indigo-fg hover:bg-indigo/90"
        >
          <IconPlus size={13} /> Add category
        </button>
      </div>

      <div className="rounded-2xl border border-line bg-white">
        {categories.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">
            No categories yet. Click &ldquo;Add category&rdquo; to create one.
          </p>
        ) : (
          <ul>
            {categories.map((c, i) => (
              <CategoryRow
                key={c.id}
                category={c}
                isFirst={i === 0}
                isLast={i === categories.length - 1}
              />
            ))}
          </ul>
        )}
      </div>

      <CategoryFormModal
        open={adding}
        onOpenChange={(next) => {
          setAdding(next);
          if (!next) router.refresh();
        }}
      />
    </>
  );
}
