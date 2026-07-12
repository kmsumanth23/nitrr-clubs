"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { IconChevronDown } from "@tabler/icons-react";
import type { DriveListItem } from "@/lib/queries/admin-drives";
import { phaseLabel } from "@/lib/phase";

/**
 * Drive picker for the admin applications page.
 * Native <select> with optgroups by phase (Open / Review / Result / Draft).
 * On change, navigates to ?drive=<newId> preserving the current path.
 */
export function DrivePicker({
  drives,
  selectedId,
  clubSlug,
}: {
  drives: DriveListItem[];
  selectedId: string;
  clubSlug: string;
}) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextId = e.target.value;
    router.push(`/admin/clubs/${clubSlug}/applications?drive=${nextId}`);
  }

  // Group by phase in intended order
  const grouped = React.useMemo(() => {
    const groups: Record<string, DriveListItem[]> = {
      open: [],
      review: [],
      result: [],
      draft: [],
    };
    for (const d of drives) groups[d.phase]?.push(d);
    return groups;
  }, [drives]);

  const selectedDrive = drives.find((d) => d.id === selectedId);

  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
        Reviewing drive
      </label>
      <div className="relative">
        <select
          value={selectedId}
          onChange={handleChange}
          className="w-full appearance-none rounded-xl border border-line bg-white p-3 pr-9 text-sm font-medium text-ink outline-none focus:border-indigo"
        >
          {grouped.open.length > 0 && (
            <optgroup label="Open">
              {grouped.open.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </optgroup>
          )}
          {grouped.review.length > 0 && (
            <optgroup label="Under review">
              {grouped.review.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </optgroup>
          )}
          {grouped.result.length > 0 && (
            <optgroup label="Published">
              {grouped.result.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </optgroup>
          )}
          {grouped.draft.length > 0 && (
            <optgroup label="Draft">
              {grouped.draft.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <IconChevronDown
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
        />
      </div>
      {selectedDrive && (
        <p className="mt-1.5 text-xs text-ink-soft">
          {phaseLabel(selectedDrive.phase)} ·{" "}
          {selectedDrive.applicant_count} applicant
          {selectedDrive.applicant_count === 1 ? "" : "s"}
          {selectedDrive.pending_count > 0 && (
            <> · {selectedDrive.pending_count} pending</>
          )}
        </p>
      )}
    </div>
  );
}
