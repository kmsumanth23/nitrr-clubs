"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/lib/queries/gallery";

/**
 * Masonry-ish gallery grid with a club filter and a simple lightbox.
 * Client island: filtering + lightbox are interactive; data is server-fetched.
 */
export function GalleryGrid({ photos }: { photos: GalleryItem[] }) {
  const [active, setActive] = React.useState<string>("all"); // club slug
  const [lightbox, setLightbox] = React.useState<GalleryItem | null>(null);

  const clubs = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const p of photos) {
      if (p.club) map.set(p.club.slug, p.club.name);
    }
    return Array.from(map, ([slug, name]) => ({ slug, name }));
  }, [photos]);

  const filtered =
    active === "all"
      ? photos
      : photos.filter((p) => p.club?.slug === active);

  return (
    <div>
      {clubs.length > 0 && (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <FilterPill
            label="All"
            active={active === "all"}
            onClick={() => setActive("all")}
          />
          {clubs.map((c) => (
            <FilterPill
              key={c.slug}
              label={c.name}
              active={active === c.slug}
              onClick={() => setActive(c.slug)}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-soft">
          No photos here yet.
        </p>
      ) : (
        <div className="columns-2 gap-3 sm:columns-3 [&>*]:mb-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setLightbox(p)}
              className="block w-full overflow-hidden rounded-xl"
            >
              <img
                src={p.image_url}
                alt={p.caption ?? p.club?.name ?? "Gallery photo"}
                className="w-full rounded-xl object-cover transition-transform hover:scale-[1.02]"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/80 p-6 backdrop-blur-sm"
        >
          <figure className="max-h-[88vh] max-w-3xl">
            <img
              src={lightbox.image_url}
              alt={lightbox.caption ?? ""}
              className="max-h-[80vh] rounded-xl object-contain"
            />
            {(lightbox.caption || lightbox.club) && (
              <figcaption className="mt-3 text-center text-sm text-cream">
                {lightbox.caption}
                {lightbox.club && (
                  <span className="text-cream/70"> · {lightbox.club.name}</span>
                )}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-ink text-cream"
          : "border-line bg-transparent text-ink-soft hover:border-ink/40",
      )}
    >
      {label}
    </button>
  );
}
