"use client";

import * as React from "react";
import { ApplicationReviewRow } from "@/components/admin/application-review-row";
import type { AdminApplication } from "@/lib/queries/admin-applications";
import type { Phase } from "@/lib/phase";
import type { ApplicationStatus } from "@/lib/database.types";
import type { DriveQuestion } from "@/lib/queries/admin-drives";

type Filter = "all" | ApplicationStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "reviewing", label: "Reviewing" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "withdrawn", label: "Withdrawn" },
  { key: "removed", label: "Removed" },
];

/** Filter pills + list for one drive's applications. 16B: `questions` prop
 *  is threaded down to each review row so the modal can render dynamic
 *  Q&A against `drive_questions` prompts. */
function FilterAndList({
  applications,
  counts,
  clubSlug,
  phase,
  questions,
}: {
  applications: AdminApplication[];
  counts: Record<Filter, number>;
  clubSlug: string;
  phase: Phase;
  questions: DriveQuestion[];
}) {
  const [active, setActive] = React.useState<Filter>("all");
  const filtered =
    active === "all"
      ? applications
      : applications.filter((a) => a.status === active);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => {
          const count = counts[key] ?? 0;
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={
                "rounded-full border px-3 py-1.5 text-xs transition-colors " +
                (isActive
                  ? "border-ink bg-ink text-cream"
                  : "border-line bg-white text-ink-soft hover:border-ink/40 hover:text-ink")
              }
            >
              {label} <span className="ml-1 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
          No applications in this view.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((app) => (
            <ApplicationReviewRow
              key={app.id}
              app={app}
              clubSlug={clubSlug}
              phase={phase}
              questions={questions}
            />
          ))}
        </ul>
      )}
    </>
  );
}

export function ApplicationsFilter({
  applications,
  counts,
  clubSlug,
  phase,
  questions,
}: {
  applications: AdminApplication[];
  counts: Record<Filter, number>;
  clubSlug: string;
  phase: Phase;
  questions: DriveQuestion[];
}) {
  return (
    <FilterAndList
      applications={applications}
      counts={counts}
      clubSlug={clubSlug}
      phase={phase}
      questions={questions}
    />
  );
}

// 16B: `ApplicationsTabsView` + `HistoryGroup` removed. The pre-16B "history"
// concept ("prior recruitments") is subsumed by 16B's drive picker on the
// admin apps page — each drive is independent, past + present + draft are
// all navigable via the picker. `getApplicationHistoryForClub` in
// `lib/queries/admin-applications.ts` is dead code from here; leaving it for
// a future maintenance sweep (matches how updateRecruitment /
// startNewRecruitment are handled post-16A).