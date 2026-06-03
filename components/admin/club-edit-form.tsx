"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateClub, type ClubEditResult } from "@/lib/actions/club";
import { HighlightsInput } from "@/components/admin/highlights-input";
import { Modal } from "@/components/ui/modal";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import type { Club, Category, AdminTier } from "@/lib/database.types";

/**
 * Edit form for one club. All tiers (editor/manager/lead) can edit content.
 * Now includes both recruitment_deadline and result_date.
 */
export function ClubEditForm({
  club,
  categories,
  tier,
}: {
  club: Club & { category: Category | null };
  categories: Category[];
  tier: AdminTier;
}) {
  const [state, formAction] = useActionState<ClubEditResult, FormData>(
    updateClub,
    {},
  );

  const formRef = React.useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const bypassRef = React.useRef(false);

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

  const deadlineDefault = club.recruitment_deadline
    ? toLocalInputValue(club.recruitment_deadline)
    : "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultDefault = (club as any).result_date
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? toLocalInputValue((club as any).result_date)
    : "";

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={onSubmit}
        onChange={() => setDirty(true)}
        className="space-y-6"
      >
        <input type="hidden" name="id" value={club.id} />

        <div className="rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-ink">Basics</h3>
          <Field label="Club name" name="name" defaultValue={club.name} required />
          <Field
            label="Tagline"
            name="tagline"
            defaultValue={club.tagline ?? ""}
            placeholder="A short one-liner"
          />
          <div>
            <label className="mb-1.5 mt-4 block text-sm font-medium text-ink">
              Category
            </label>
            <select
              name="category_id"
              defaultValue={club.category_id ?? ""}
              className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
            >
              <option value="">— Uncategorized —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Description
            </label>
            <textarea
              name="description"
              rows={4}
              defaultValue={club.description ?? ""}
              placeholder="What does this club do? What's its story?"
              className="w-full resize-none rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-indigo"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-ink">Highlights</h3>
          <HighlightsInput initial={club.highlights ?? []} />
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-ink">Recruitment</h3>
          <label className="mb-3 flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="is_recruiting"
              defaultChecked={club.is_recruiting}
              className="h-4 w-4 rounded border-line accent-indigo"
            />
            Open for applications
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Application deadline
              </label>
              <input
                type="datetime-local"
                name="recruitment_deadline"
                defaultValue={deadlineDefault}
                className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
              />
              <p className="mt-1.5 text-[11px] text-ink-soft">
                Students can apply, edit, and withdraw until this time.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Result date (target)
              </label>
              <input
                type="datetime-local"
                name="result_date"
                defaultValue={resultDefault}
                className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
              />
              <p className="mt-1.5 text-[11px] text-ink-soft">
                Promised date for results. Extendable; results publish via the
                lead&apos;s &quot;Publish&quot; button on the Applications page.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Field
              label="Member count"
              name="member_count"
              type="number"
              defaultValue={String(club.member_count ?? 0)}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-ink">Socials</h3>
          <Field
            label="Instagram URL"
            name="instagram_url"
            defaultValue={club.instagram_url ?? ""}
            placeholder="https://instagram.com/your_club"
          />
          <Field
            label="LinkedIn URL"
            name="linkedin_url"
            defaultValue={club.linkedin_url ?? ""}
            placeholder="https://linkedin.com/company/your_club"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-ink-soft">
            You&apos;re editing as <span className="font-medium capitalize text-ink">{tier}</span>.
            {dirty && <span className="ml-2 text-clay">Unsaved changes</span>}
          </span>
          <div className="flex items-center gap-3">
            {state.error && <p className="text-xs text-clay">{state.error}</p>}
            {state.ok && !dirty && <p className="text-xs text-sport">Saved.</p>}
            <SaveButton />
          </div>
        </div>
      </form>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="space-y-4">
          <h3 className="font-display text-lg font-bold text-ink">
            Save these changes?
          </h3>
          <p className="text-sm text-ink-soft">
            Your edits will replace the current content. The public club page
            updates within about a minute.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmSave}
              className="rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90"
            >
              Yes, save
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

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <label className="mb-1.5 block text-sm font-medium text-ink">
        {label} {required && <span className="text-clay">*</span>}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
      />
    </div>
  );
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
