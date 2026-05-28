"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  submitApplication,
  type ApplyResult,
} from "@/lib/actions/application";

interface KnownProfile {
  full_name: string | null;
  roll_number: string | null;
  year: number | null;
  branch: string | null;
}

/**
 * Apply form. Known profile fields shown read-only; 3 generic questions are
 * the inputs. If the student has a WITHDRAWN row, submitting re-applies (the
 * action revives it). An ACTIVE row → "already applied".
 */
export function ApplyForm({
  clubId,
  clubName,
  profile,
  existingStatus,
}: {
  clubId: string;
  clubName: string;
  profile: KnownProfile;
  existingStatus: string | null;
}) {
  const [state, formAction] = useActionState<ApplyResult, FormData>(
    submitApplication,
    {},
  );

  if (state.alreadyApplied) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 text-center">
        <p className="text-sm text-ink">
          You&apos;ve already applied to {clubName}.
        </p>
        <Link
          href="/profile"
          className="mt-3 inline-block text-sm font-medium text-indigo"
        >
          View your applications →
        </Link>
      </div>
    );
  }

  const reapplying = existingStatus === "withdrawn";

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="clubId" value={clubId} />

      {reapplying && (
        <div className="rounded-2xl border border-indigo-soft bg-indigo-soft px-4 py-3 text-xs text-indigo">
          You previously withdrew. Submitting will re-apply with your new answers.
        </div>
      )}

      <div className="rounded-2xl border border-line bg-beige p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
          Applying as
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Name" value={profile.full_name} />
          <Field label="Roll number" value={profile.roll_number} />
          <Field label="Year" value={profile.year?.toString()} />
          <Field label="Branch" value={profile.branch} />
        </div>
      </div>

      <Question name="motivation" label="Why do you want to join?" placeholder="What draws you to this club?" required />
      <Question name="experience" label="Relevant experience or skills" placeholder="Anything you've done before (optional)" />
      <Question name="contribution" label="What can you contribute?" placeholder="How would you add to the club?" required />

      {state.error && <p className="text-center text-xs text-clay">{state.error}</p>}

      <Submit reapplying={reapplying} />
    </form>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[11px] text-ink-soft">{label}</div>
      <div className="font-medium text-ink">{value || "—"}</div>
    </div>
  );
}

function Question({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">
        {label} {required && <span className="text-clay">*</span>}
      </label>
      <textarea
        name={name}
        rows={3}
        required={required}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-indigo"
      />
    </div>
  );
}

function Submit({ reapplying }: { reapplying: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-indigo px-6 py-3 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      {pending ? "Submitting…" : reapplying ? "Re-apply" : "Submit application"}
    </button>
  );
}
