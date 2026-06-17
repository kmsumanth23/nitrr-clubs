"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AuditEntryRow } from "@/components/admin/audit-entry-row";
import {
  CATEGORY_LABEL,
  type AuditCategory,
} from "@/lib/audit/categorize";
import type { AuditEntry } from "@/lib/queries/audit";
import type { ClubFilterOption } from "@/lib/clubs/list-for-filter";

const PILLS: { key: AuditCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "club_admins", label: CATEGORY_LABEL.club_admins },
  { key: "clubs", label: CATEGORY_LABEL.clubs },
  { key: "super_admins", label: CATEGORY_LABEL.super_admins },
  { key: "members", label: CATEGORY_LABEL.members },
];

export function AuditLogView({
  entries,
  page,
  hasNext,
  category,
  selectedClubId,
  clubsForFilter,
  fixedToClubSlug,
}: {
  entries: AuditEntry[];
  page: number;
  hasNext: boolean;
  category: AuditCategory;
  selectedClubId: string | null;
  clubsForFilter: ClubFilterOption[];
  /** Per-club page passes a slug here; hides the club dropdown and the
   *  inline club link on each row. */
  fixedToClubSlug?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  function updateQuery(
    next: Partial<{
      cat: string;
      club: string;
      page: string;
      cursor: string;
    }>,
  ) {
    const params = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function onPillClick(c: AuditCategory) {
    updateQuery({
      cat: c === "all" ? "" : c,
      page: "",
      cursor: "",
    });
  }

  function onClubChange(e: React.ChangeEvent<HTMLSelectElement>) {
    updateQuery({
      club: e.target.value || "",
      page: "",
      cursor: "",
    });
  }

  function onNext() {
    if (entries.length === 0) return;
    const cursor = entries[entries.length - 1].created_at;
    updateQuery({ cursor, page: String(page + 1) });
  }

  function onPrev() {
    // Simple back: clear cursor + page (sends back to page 1). True back-
    // navigation cursor chain would need a stack; v1 doesn't.
    updateQuery({ cursor: "", page: "" });
  }

  return (
    <>
      {/* Pills + club dropdown */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {PILLS.map(({ key, label }) => {
            const active = category === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onPillClick(key)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs transition-colors " +
                  (active
                    ? "border-ink bg-ink text-cream"
                    : "border-line bg-white text-ink-soft hover:border-ink/40 hover:text-ink")
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {!fixedToClubSlug && clubsForFilter.length > 0 && (
          <select
            value={selectedClubId ?? ""}
            onChange={onClubChange}
            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs text-ink outline-none focus:border-indigo"
          >
            <option value="">All clubs</option>
            {clubsForFilter.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* List */}
      <div className="rounded-2xl border border-line bg-white">
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">
            No audit entries match this filter.
          </p>
        ) : (
          <ul>
            {entries.map((e) => (
              <AuditEntryRow
                key={e.id}
                entry={e}
                hideClubLink={!!fixedToClubSlug}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-ink-soft">
        <span>
          Page {page}
          {entries.length > 0 && (
            <>
              {" "}· {entries.length} entr{entries.length === 1 ? "y" : "ies"}
            </>
          )}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={page <= 1}
            className="rounded-full border border-line bg-white px-3 py-1 hover:border-ink/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className="rounded-full border border-line bg-white px-3 py-1 hover:border-ink/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </div>
    </>
  );
}
