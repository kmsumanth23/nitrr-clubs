"use client";

import * as React from "react";
import { GalleryUploader } from "@/components/admin/gallery-uploader";
import { GalleryPhotoRow } from "@/components/admin/gallery-photo-row";
import { GalleryBulkActions } from "@/components/admin/gallery-bulk-actions";
import type { AdminGalleryPhoto } from "@/lib/queries/admin-gallery";

export function GalleryManager({
  clubId,
  clubSlug,
  photos,
}: {
  clubId: string;
  clubSlug: string;
  photos: AdminGalleryPhoto[];
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(photos.map((p) => p.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const selectedIds = Array.from(selected);
  const allSelected =
    photos.length > 0 && selectedIds.length === photos.length;

  return (
    <div className="space-y-6">
      <GalleryUploader clubId={clubId} clubSlug={clubSlug} />

      {photos.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
          No photos yet. Drag some onto the area above to get started.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span>
              {photos.length} photo{photos.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={allSelected ? clearSelection : selectAll}
              className="hover:text-ink"
            >
              {allSelected ? "Clear selection" : "Select all"}
            </button>
          </div>

          <ul className="space-y-2">
            {photos.map((p) => (
              <GalleryPhotoRow
                key={p.id}
                photo={p}
                clubSlug={clubSlug}
                selected={selected.has(p.id)}
                onToggleSelect={() => toggleSelect(p.id)}
              />
            ))}
          </ul>
        </>
      )}

      <GalleryBulkActions
        selectedIds={selectedIds}
        clubSlug={clubSlug}
        onClear={clearSelection}
      />
    </div>
  );
}
