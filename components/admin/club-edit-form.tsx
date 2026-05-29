"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateClub, type ClubEditResult } from "@/lib/actions/club";
import { HighlightsInput } from "@/components/admin/highlights-input";
import type { Club, Category, AdminTier } from "@/lib/database.types";

/**
 * Edit form for one club. The tier doesn't gate fields here (all editors can
 * edit content — that was decided in 9a), but tier IS surfaced so the user
 * sees their role. Recruitment toggle + deadline are content fields too, so
 * editors can adjust them.
 *
 * Server-side, RLS + can_edit_club_content() is the actual authority.
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

  // datetime-local needs "YYYY-MM-DDTHH:mm" with no timezone
  const deadlineDefault = club.recruitment_deadline
    ? toLocalInputValue(club.recruitment_deadline)
    : "";

  return (
    <form action={formAction} className="space-y-6">
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
            Single cutoff for apply / re-apply / withdraw / edit. After this
            time the application is frozen.
          </p>
        </div>
        <Field
          label="Member count"
          name="member_count"
          type="number"
          defaultValue={String(club.member_count ?? 0)}
        />
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
        </span>
        <div className="flex items-center gap-3">
          {state.error && <p className="text-xs text-clay">{state.error}</p>}
          {state.ok && <p className="text-xs text-sport">Saved.</p>}
          <SaveButton />
        </div>
      </div>
    </form>
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

/** Convert ISO/UTC string to "YYYY-MM-DDTHH:mm" for datetime-local input. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
