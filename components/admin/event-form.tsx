"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createEvent,
  updateEvent,
  type EventResult,
} from "@/lib/actions/event";
import { slugify } from "@/lib/validation/event";
import { Modal } from "@/components/ui/modal";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import type { EventRow } from "@/lib/database.types";

/**
 * Create or edit an event. Same form.
 * Safety: save-confirm modal + unsaved-changes guard, matching the club edit
 * form. On edit, the action stays on the page (returns ok); on create, it
 * redirects to the events list.
 */
export function EventForm({
  mode,
  clubId,
  clubSlug,
  event,
}: {
  mode: "create" | "edit";
  clubId: string;
  clubSlug: string;
  event?: EventRow;
}) {
  const action = mode === "create" ? createEvent : updateEvent;
  const [state, formAction] = useActionState<EventResult, FormData>(action, {});

  const formRef = React.useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const bypassRef = React.useRef(false);

  // auto-slug from title on create until the user touches the slug
  const [title, setTitle] = React.useState(event?.title ?? "");
  const [slug, setSlug] = React.useState(event?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(mode === "edit");

  React.useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  React.useEffect(() => {
    if (state.ok) setDirty(false);
  }, [state.ok]);

  useUnsavedChanges(dirty);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (bypassRef.current) {
      bypassRef.current = false;
      return;
    }
    e.preventDefault();
    setConfirmOpen(true);
  }

  function confirmSave() {
    setConfirmOpen(false);
    bypassRef.current = true;
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={onSubmit}
        onChange={() => setDirty(true)}
        className="space-y-6"
      >
        {event?.id && <input type="hidden" name="id" value={event.id} />}
        <input type="hidden" name="club_id" value={clubId} />
        <input type="hidden" name="__club_slug" value={clubSlug} />

        <div className="rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-ink">Basics</h3>
          <Text
            label="Title"
            name="title"
            required
            value={title}
            onChange={setTitle}
          />
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-ink">
              URL slug <span className="text-clay">*</span>
            </label>
            <input
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="e.g. hacknitrr-2026"
              className="w-full rounded-xl border border-line bg-white p-2.5 font-mono text-sm text-ink outline-none focus:border-indigo"
              required
            />
            <p className="mt-1.5 text-[11px] text-ink-soft">
              Lowercase letters, numbers, and hyphens. Must be unique across all
              clubs.
            </p>
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Description
            </label>
            <textarea
              name="description"
              defaultValue={event?.description ?? ""}
              rows={4}
              className="w-full resize-none rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-indigo"
              placeholder="What is this event? Who is it for?"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-ink">When &amp; where</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateField
              label="Starts at"
              name="starts_at"
              defaultValue={event?.starts_at}
            />
            <DateField
              label="Ends at"
              name="ends_at"
              defaultValue={event?.ends_at}
            />
          </div>
          <div className="mt-4">
            <Text
              label="Venue"
              name="venue"
              defaultValue={event?.venue ?? ""}
              placeholder="e.g. Main Auditorium"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-ink">Registration</h3>
          <label className="mb-3 flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="reg_open"
              defaultChecked={event?.reg_open ?? true}
              className="h-4 w-4 rounded border-line accent-indigo"
            />
            Open for registration
          </label>
          <Text
            label="External registration URL"
            name="reg_url"
            defaultValue={event?.reg_url ?? ""}
            placeholder="https://forms.gle/..."
          />
          <p className="mt-1.5 text-[11px] text-ink-soft">
            Optional. If set, the public &quot;Register&quot; button on the event
            page links here.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-ink">Poster</h3>
          <Text
            label="Poster image URL"
            name="poster_url"
            defaultValue={event?.poster_url ?? ""}
            placeholder="https://..."
          />
          <p className="mt-1.5 text-[11px] text-ink-soft">
            Direct image upload comes with 9e (gallery / Storage). For now, paste
            a URL.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          {dirty && <span className="text-xs text-clay">Unsaved changes</span>}
          {state.error && <p className="text-xs text-clay">{state.error}</p>}
          {state.ok && !dirty && <p className="text-xs text-sport">Saved.</p>}
          <SaveButton mode={mode} />
        </div>
      </form>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="space-y-4">
          <h3 className="font-display text-lg font-bold text-ink">
            {mode === "create" ? "Create this event?" : "Save these changes?"}
          </h3>
          <p className="text-sm text-ink-soft">
            {mode === "create"
              ? "The event will appear on the public events page within about a minute."
              : "Your edits will replace the current event details. The public page updates within about a minute."}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmSave}
              className="rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90"
            >
              {mode === "create" ? "Yes, create" : "Yes, save"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-cream"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Text({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  value,
  onChange,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">
        {label} {required && <span className="text-clay">*</span>}
      </label>
      {onChange ? (
        <input
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
        />
      )}
    </div>
  );
}

function DateField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  const local = defaultValue ? toLocalInputValue(defaultValue) : "";
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <input
        type="datetime-local"
        name={name}
        defaultValue={local}
        className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
      />
    </div>
  );
}

function SaveButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      {pending
        ? mode === "create"
          ? "Creating…"
          : "Saving…"
        : mode === "create"
          ? "Create event"
          : "Save changes"}
    </button>
  );
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
