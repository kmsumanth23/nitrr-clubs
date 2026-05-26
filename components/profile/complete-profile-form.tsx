"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { completeProfile, type ProfileResult } from "@/lib/actions/profile";
import { BRANCHES } from "@/lib/validation/profile";

interface Defaults {
  full_name: string | null;
  roll_number: string | null;
  year: number | null;
  branch: string | null;
  gender: string | null;
}

/**
 * Completes a profile (used after Google sign-in, where the signup form was
 * skipped). Submits to the completeProfile action, which redirects to `next`.
 */
export function CompleteProfileForm({
  defaults,
  next,
}: {
  defaults: Defaults;
  next: string;
}) {
  const [state, formAction] = useActionState<ProfileResult, FormData>(
    completeProfile,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <Text
        name="full_name"
        label="Full name"
        defaultValue={defaults.full_name ?? ""}
        required
      />
      <Text
        name="roll_number"
        label="Roll number"
        defaultValue={defaults.roll_number ?? ""}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Year
          </label>
          <select
            name="year"
            defaultValue={defaults.year ?? ""}
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
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Gender
          </label>
          <select
            name="gender"
            defaultValue={defaults.gender ?? ""}
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
          defaultValue={defaults.branch ?? ""}
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

      <Submit />
    </form>
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
      className="w-full rounded-full bg-indigo px-6 py-3 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save and continue"}
    </button>
  );
}
