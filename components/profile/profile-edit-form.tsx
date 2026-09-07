"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProfile, type ProfileResult } from "@/lib/actions/profile";
import { BRANCHES } from "@/lib/validation/profile";
import type { Profile } from "@/lib/database.types";

/**
 * 19b: `year_changes_remaining` is on the `profiles` table via the 19b
 * migration. Declared as an optional local override so this component
 * type-checks against both pre- and post-regen `Profile` types. Once the
 * user regenerates types after applying 19b, the field will exist on the
 * base type and this augmentation becomes a harmless narrowing.
 */
type ProfileWithChances = Profile & {
  year_changes_remaining?: number | null;
};

/**
 * Profile view with inline-toggle edit. View mode = read-only summary;
 * Edit mode = same fields as /profile/complete. On success, flips back to
 * view (the action returns { ok: true } when no `next` param is sent).
 */
export function ProfileEditForm({ profile }: { profile: ProfileWithChances }) {
  const chancesRemaining = profile.year_changes_remaining ?? null;
  const [editing, setEditing] = React.useState(false);
  const [state, formAction, isPending] = useActionState<ProfileResult, FormData>(
    updateProfile,
    {},
  );
  const router = useRouter();

  // Lesson 20: `state.ok` is sticky across successive successful saves, so a
  // `[state.ok]` dep only fires on the first save — subsequent saves would
  // leave the form open. Watch the isPending → false transition instead so
  // this runs after every completed save.
  //
  // router.refresh() forces the server component parent (`/profile` page) to
  // re-fetch and re-render with the fresh `profile` prop. Without it, the
  // read-only view + edit-form defaultValues stay frozen at the pre-first-
  // save value even after a successful save — user only sees the correct
  // year after a full browser refresh.
  const wasPendingRef = React.useRef(false);
  React.useEffect(() => {
    if (wasPendingRef.current && !isPending && state.ok && !state.error) {
      setEditing(false);
      router.refresh();
    }
    wasPendingRef.current = isPending;
  });

  if (!editing) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">
              {profile.full_name ?? "Unnamed student"}
            </h2>
            <p className="text-sm text-ink-soft">{profile.email}</p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="rounded-full border border-line px-4 py-1.5 text-xs font-medium text-ink hover:bg-cream"
          >
            Edit
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Field label="Roll number" value={profile.roll_number} />
          <Field label="Year" value={profile.year?.toString()} />
          <Field label="Branch" value={profile.branch} />
          <Field label="Gender" value={profile.gender ?? "—"} />
        </dl>
        <div className="mt-5 border-t border-line pt-4 text-right">
          <Link
            href="/auth/reset-password"
            className="text-xs text-ink-soft hover:text-indigo hover:underline"
          >
            Change password →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-line bg-white p-6"
    >
      <Text
        name="full_name"
        label="Full name"
        defaultValue={profile.full_name ?? ""}
        required
      />
      <Text
        name="roll_number"
        label="Roll number"
        defaultValue={profile.roll_number ?? ""}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Year
          </label>
          <select
            name="year"
            defaultValue={profile.year ?? ""}
            required
            className="w-full rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-indigo"
          >
            <option value="" disabled>
              Select
            </option>
            {[1, 2, 3, 4, 5].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>
          {/* 19b: soft-cap hint. Only shows once the user has an active
              year (not first-time signup completion). If they've hit 0
              chances, the DB trigger will error at save with a friendly
              message telling them to contact a coordinator. */}
          {chancesRemaining !== null && profile.year != null && (
            <p className="mt-1.5 text-[11px] text-ink-soft">
              {chancesRemaining > 0
                ? `${chancesRemaining} of 3 year changes remaining.`
                : "No self-service year changes left — contact a coordinator to update it."}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Gender
          </label>
          <select
            name="gender"
            defaultValue={profile.gender ?? ""}
            className="w-full rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-indigo"
          >
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Branch
        </label>
        <select
          name="branch"
          defaultValue={profile.branch ?? ""}
          required
          className="w-full rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-indigo"
        >
          <option value="" disabled>
            Select your branch
          </option>
          {BRANCHES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {state.error && (
        <p className="text-center text-xs text-clay">{state.error}</p>
      )}

      <div className="flex gap-2">
        <Submit />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-cream"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-soft">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium text-ink">{value || "—"}</dd>
    </div>
  );
}

function Text({
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">
        {label} {required && <span className="text-clay">*</span>}
      </label>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-indigo"
      />
    </div>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-indigo px-6 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}
