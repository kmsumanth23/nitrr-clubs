"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  IconArrowUp,
  IconArrowDown,
  IconCheck,
  IconX,
  IconPencil,
} from "@tabler/icons-react";
import {
  updateCaption,
  reorderPhoto,
  toggleHomepage,
  type GalleryResult,
} from "@/lib/actions/gallery";
import type { AdminGalleryPhoto } from "@/lib/queries/admin-gallery";

export function GalleryPhotoRow({
  photo,
  clubSlug,
  selected,
  onToggleSelect,
}: {
  photo: AdminGalleryPhoto;
  clubSlug: string;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [showOnHome, setShowOnHome] = React.useState(photo.show_on_homepage);

  return (
    <li
      className={
        "flex items-start gap-3 rounded-2xl border bg-white p-3 transition-colors " +
        (selected ? "border-indigo bg-indigo/5" : "border-line")
      }
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        className="mt-2 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-line accent-indigo"
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.image_url}
        alt={photo.caption ?? ""}
        className="h-20 w-28 flex-shrink-0 rounded-xl object-cover"
        loading="lazy"
      />

      <div className="min-w-0 flex-1 space-y-1.5">
        {editing ? (
          <CaptionEditor
            photoId={photo.id}
            clubSlug={clubSlug}
            initial={photo.caption ?? ""}
            onDone={() => setEditing(false)}
          />
        ) : (
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm text-ink">
              {photo.caption ?? <span className="text-ink-soft italic">No caption</span>}
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit caption"
              className="rounded-full p-1 text-ink-soft hover:bg-cream hover:text-ink"
            >
              <IconPencil size={13} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px]">
          <HomepageToggle
            photoId={photo.id}
            clubSlug={clubSlug}
            show={showOnHome}
            onChanged={setShowOnHome}
          />
          <span className="text-ink-soft">
            {new Date(photo.created_at).toLocaleDateString("en-IN")}
          </span>
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col gap-1">
        <ReorderButton photoId={photo.id} clubSlug={clubSlug} direction="up" />
        <ReorderButton photoId={photo.id} clubSlug={clubSlug} direction="down" />
      </div>
    </li>
  );
}

function CaptionEditor({
  photoId,
  clubSlug,
  initial,
  onDone,
}: {
  photoId: string;
  clubSlug: string;
  initial: string;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<GalleryResult, FormData>(
    updateCaption,
    {},
  );

  React.useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="space-y-1.5">
      <input type="hidden" name="photoId" value={photoId} />
      <input type="hidden" name="__club_slug" value={clubSlug} />
      <input
        name="caption"
        defaultValue={initial}
        maxLength={280}
        placeholder="Add a caption…"
        autoFocus
        className="w-full rounded-lg border border-line bg-white p-1.5 text-sm text-ink outline-none focus:border-indigo"
      />
      {state.error && <p className="text-[11px] text-clay">{state.error}</p>}
      <div className="flex items-center gap-1">
        <SaveBtn />
        <button
          type="button"
          onClick={onDone}
          className="flex items-center gap-1 rounded-full border border-line px-2 py-1 text-[11px] text-ink hover:bg-cream"
        >
          <IconX size={11} /> Cancel
        </button>
      </div>
    </form>
  );
}

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1 rounded-full bg-indigo px-2.5 py-1 text-[11px] font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      <IconCheck size={11} /> {pending ? "Saving…" : "Save"}
    </button>
  );
}

function ReorderButton({
  photoId,
  clubSlug,
  direction,
}: {
  photoId: string;
  clubSlug: string;
  direction: "up" | "down";
}) {
  const [, formAction] = useActionState<GalleryResult, FormData>(
    reorderPhoto,
    {},
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="photoId" value={photoId} />
      <input type="hidden" name="direction" value={direction} />
      <input type="hidden" name="__club_slug" value={clubSlug} />
      <button
        type="submit"
        aria-label={`Move ${direction}`}
        className="rounded-full p-1 text-ink-soft hover:bg-cream hover:text-ink"
      >
        {direction === "up" ? <IconArrowUp size={13} /> : <IconArrowDown size={13} />}
      </button>
    </form>
  );
}

function HomepageToggle({
  photoId,
  clubSlug,
  show,
  onChanged,
}: {
  photoId: string;
  clubSlug: string;
  show: boolean;
  onChanged: (next: boolean) => void;
}) {
  const [, formAction] = useActionState<GalleryResult, FormData>(
    toggleHomepage,
    {},
  );
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="photoId" value={photoId} />
      <input type="hidden" name="__club_slug" value={clubSlug} />
      <input type="hidden" name="show" value={(!show).toString()} />
      <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-ink-soft hover:text-ink">
        <input
          type="checkbox"
          checked={show}
          onChange={() => {
            onChanged(!show);
            formRef.current?.requestSubmit();
          }}
          className="h-3 w-3 rounded border-line accent-indigo"
        />
        Show on homepage
      </label>
    </form>
  );
}
