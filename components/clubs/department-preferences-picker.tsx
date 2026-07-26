"use client";

import * as React from "react";
import { IconChevronDown } from "@tabler/icons-react";

interface Department {
  id: string;
  name: string;
  sort_order: number;
}

/**
 * Ranked preferences picker for the apply form.
 *
 * Renders N dropdowns (1st, 2nd, ...) where N = maxChoices.
 * - 1st choice is REQUIRED
 * - Each dropdown filters out already-selected values (dynamic)
 * - Selections serialize as JSON array in a hidden input for the server action
 */
export function DepartmentPreferencesPicker({
  departments,
  maxChoices,
  defaultValue,
}: {
  departments: Department[];
  maxChoices: number;
  defaultValue: string[] | null;
}) {
  // State: ordered array of department UUIDs; empty string = unselected
  const [selections, setSelections] = React.useState<string[]>(() => {
    const initial = new Array(maxChoices).fill("");
    if (defaultValue) {
      defaultValue.slice(0, maxChoices).forEach((id, idx) => {
        // Verify the department still exists (may have been deleted mid-Open)
        if (departments.some((d) => d.id === id)) {
          initial[idx] = id;
        }
      });
    }
    return initial;
  });

  function setChoice(idx: number, deptId: string) {
    const next = [...selections];
    next[idx] = deptId;
    setSelections(next);
  }

  // Compact filter: filter out selected departments from OTHER rows,
  // but keep the currently-selected one visible in its own row
  function availableForRow(rowIdx: number): Department[] {
    const takenByOthers = new Set(
      selections
        .map((sel, i) => (i !== rowIdx ? sel : ""))
        .filter((s) => s !== ""),
    );
    return departments.filter((d) => !takenByOthers.has(d.id));
  }

  const sortedDepts = [...departments].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  // Filter empty strings from serialized value (trailing unselected slots
  // don't need to be sent — they're implicitly "no choice")
  const serialized = JSON.stringify(selections.filter((s) => s !== ""));

  return (
    <div className="rounded-2xl border border-line bg-beige p-4">
      <input type="hidden" name="preferredDepartments" value={serialized} />

      <h4 className="mb-1 font-display text-sm font-bold text-ink">
        Rank your department preferences
      </h4>
      <p className="mb-4 text-[11px] text-ink-soft">
        Up to {maxChoices} choice{maxChoices === 1 ? "" : "s"}. Your 1st choice
        is required. Rank in order of preference — admins consider these when
        placing you.
      </p>

      <div className="space-y-2">
        {selections.map((selectedId, idx) => {
          const isRequired = idx === 0;
          const available = availableForRow(idx);
          // Show all sorted departments in options, but disable ones already
          // selected in other rows (dynamic filtering)
          const takenByOthers = new Set(
            selections.filter((_, i) => i !== idx).filter((s) => s !== ""),
          );

          return (
            <PreferenceSlot
              key={idx}
              rank={idx + 1}
              required={isRequired}
              selectedId={selectedId}
              options={sortedDepts}
              takenByOthers={takenByOthers}
              onChange={(id) => setChoice(idx, id)}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ============================= Preference slot ============================= */

function PreferenceSlot({
  rank,
  required,
  selectedId,
  options,
  takenByOthers,
  onChange,
}: {
  rank: number;
  required: boolean;
  selectedId: string;
  options: Department[];
  takenByOthers: Set<string>;
  onChange: (id: string) => void;
}) {
  const rankSuffix = ordinalSuffix(rank);

  return (
    <label className="flex flex-wrap items-center gap-2">
      <span className="w-28 text-xs font-medium text-ink">
        {rank}
        <sup>{rankSuffix}</sup> choice{" "}
        {required && <span className="text-clay">*</span>}
      </span>
      <div className="relative flex-1">
        <select
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full appearance-none rounded-xl border border-line bg-white py-2 pl-3 pr-8 text-sm text-ink outline-none focus:border-indigo"
        >
          <option value="">— {required ? "Select" : "Optional"} —</option>
          {options.map((d) => (
            <option
              key={d.id}
              value={d.id}
              disabled={takenByOthers.has(d.id) && d.id !== selectedId}
            >
              {d.name}
              {takenByOthers.has(d.id) && d.id !== selectedId
                ? " (already picked)"
                : ""}
            </option>
          ))}
        </select>
        <IconChevronDown
          size={12}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
        />
      </div>
    </label>
  );
}

/* ============================= Helpers ============================= */

function ordinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}
