"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { setUserYear, type AdminProfileResult } from "@/lib/actions/admin-profile";
import { ProfileSearch } from "@/components/admin/profile-search";
import type { ProfileSearchResult } from "@/lib/queries/profile-search";

/**
 * 19b — Sysadmin-only escape hatch for year edits.
 *
 * Renders inside `/admin/sysadmin/diagnostics`. Uses the global-mode
 * ProfileSearch (no clubId — sysadmin can reach anyone). Selecting a
 * profile shows their current year + a dropdown to overwrite it.
 *
 * The RPC bypasses the `enforce_year_edit_rules` trigger, so:
 *  - No counter decrement (this is an override, not a self-service change).
 *  - No active-application freeze check (override is exactly for cases
 *    where the student is stuck behind the freeze).
 *  - Writes an audit_log entry so the override is traceable.
 */
export function SysadminYearOverride() {
  const [selected, setSelected] = React.useState<ProfileSearchResult | null>(
    null,
  );
  const [year, setYear] = React.useState<string>("");
  const [state, formAction, isPending] = useActionState<
    AdminProfileResult,
    FormData
  >(setUserYear, {});

  // Reset the form when the target changes (or is cleared) so a stale year
  // selection from a previous target doesn't leak into the next submission.
  React.useEffect(() => {
    setYear(selected?.year != null ? String(selected.year) : "");
  }, [selected]);

  // Auto-clear success feedback after a moment so the block visually
  // returns to "ready for the next override" without extra input.
  const wasPendingRef = React.useRef(false);
  React.useEffect(() => {
    if (wasPendingRef.current && !isPending && state.ok && !state.error) {
      // Keep the selected profile visible with the new year — the audit trail
      // + revalidatePath means their year is now the fresh value.
      // Give the ProfileSearch a small refresh signal by clearing then
      // re-setting selection is overkill; instead, just optimistically
      // update the visible year on the selected card via a local mirror.
      if (selected && year !== "") {
        setSelected({ ...selected, year: Number(year) });
      }
    }
    wasPendingRef.current = isPending;
  });

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <h3 className="mb-1 font-display text-sm font-bold text-ink">
        Override a user&apos;s year
      </h3>
      <p className="mb-4 text-xs text-ink-soft">
        Escape hatch for students blocked by the year-edit freeze (active
        application) or the 3-change soft cap. Bypasses both rules and writes
        an audit trail. Does <span className="font-medium">not</span> consume
        the user&apos;s change counter.
      </p>

      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-ink-soft">
          Find profile
        </label>
        <ProfileSearch selected={selected} onSelect={setSelected} />
      </div>

      {selected && (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="profileId" value={selected.id} />

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-cream/40 p-3 text-xs">
            <Meta
              label="Current year"
              value={selected.year != null ? `Year ${selected.year}` : "—"}
            />
            <Meta label="Roll" value={selected.roll_number ?? "—"} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Set year to
            </label>
            <select
              name="year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
              className="w-full rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo"
            >
              <option value="" disabled>
                Select
              </option>
              {[1, 2, 3, 4].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>

          {state.error && (
            <p className="inline-flex items-start gap-1 text-xs text-clay">
              <IconAlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              {state.error}
            </p>
          )}
          {state.ok && !state.error && (
            <p className="inline-flex items-start gap-1 text-xs text-sport">
              <IconCheck size={12} className="mt-0.5 flex-shrink-0" />
              Year updated. Audit entry written.
            </p>
          )}

          <ConfirmBtn
            disabled={!year || Number(year) === selected.year}
            isNoop={year !== "" && Number(year) === selected.year}
          />
        </form>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-ink-soft">
        {label}
      </div>
      <div className="mt-0.5 font-medium text-ink">{value}</div>
    </div>
  );
}

function ConfirmBtn({
  disabled,
  isNoop,
}: {
  disabled: boolean;
  isNoop: boolean;
}) {
  const { pending } = useFormStatus();
  const label = pending
    ? "Saving…"
    : isNoop
      ? "No change"
      : "Override year";
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center gap-1.5 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
