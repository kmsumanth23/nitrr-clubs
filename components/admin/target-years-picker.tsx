"use client";

import * as React from "react";

const YEARS = [1, 2, 3, 4] as const;

/**
 * Multi-select for target years. Controlled — parent owns state.
 * Renders 4 chip buttons + a hidden input with JSON-stringified value
 * for the enclosing form.
 *
 * Used inside <DriveEditorForm>. Value is `targetYears: number[]`.
 */
export function TargetYearsPicker({
  value,
  onChange,
  disabled,
  name = "targetYears",
}: {
  value: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
  name?: string;
}) {
  function toggle(year: number) {
    if (disabled) return;
    if (value.includes(year)) {
      onChange(value.filter((y) => y !== year));
    } else {
      onChange([...value, year].sort((a, b) => a - b));
    }
  }

  return (
    <>
      <input type="hidden" name={name} value={JSON.stringify(value)} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {YEARS.map((year) => {
          const selected = value.includes(year);
          return (
            <button
              key={year}
              type="button"
              onClick={() => toggle(year)}
              disabled={disabled}
              aria-pressed={selected}
              className={
                "rounded-2xl border p-4 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
                (selected
                  ? "border-ink bg-ink text-cream"
                  : "border-line bg-white text-ink hover:bg-cream")
              }
            >
              <div className="text-xl font-bold">
                {year}
                {ordinal(year)}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wide opacity-70">
                year
              </div>
            </button>
          );
        })}
      </div>
      {value.length === 0 && (
        <p className="mt-1 text-[11px] text-clay">
          Pick at least one year — only those students can see and apply to
          this drive.
        </p>
      )}
    </>
  );
}

function ordinal(n: number): string {
  if (n === 1) return "st";
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}

/** Human-friendly label used elsewhere (list rows, mockup card, etc). */
export function targetYearsLabel(years: number[]): string {
  if (!years || years.length === 0) return "No years";
  if (years.length === 4) return "All years";
  const sorted = [...years].sort((a, b) => a - b);
  return "Year " + sorted.join(", ");
}
