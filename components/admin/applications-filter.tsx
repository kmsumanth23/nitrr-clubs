"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ApplicationReviewRow } from "@/components/admin/application-review-row";
import type { AdminApplication } from "@/lib/queries/admin-applications";
import type { ApplicationStatus } from "@/lib/database.types";
import type { Phase } from "@/lib/phase";

type Filter = ApplicationStatus | "all";

const ORDER: Filter[] = [
  "all",
  "pending",
  "reviewing",
  "accepted",
  "rejected",
  "withdrawn",
  "removed",
];

const LABELS: Record<Filter, string> = {
  all: "All",
  pending: "Pending",
  reviewing: "Reviewing",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  removed: "Removed",
};

export function ApplicationsFilter({
  applications,
  counts,
  clubSlug,
  phase,
}: {
  applications: AdminApplication[];
  counts: Record<Filter, number>;
  clubSlug: string;
  phase: Phase;
}) {
  // Default tab: pending in review phase, all in open phase, accepted in result
  const defaultFilter: Filter =
    phase === "review" ? "pending" : phase === "result" ? "accepted" : "all";
  const [active, setActive] = React.useState<Filter>(defaultFilter);

  const filtered = React.useMemo(() => {
    if (active === "all") return applications;
    return applications.filter((a) => a.status === active);
  }, [applications, active]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {ORDER.map((f) => (
          <button
            key={f}
            onClick={() => setActive(f)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              active === f
                ? "border-transparent bg-ink text-cream"
                : "border-line bg-transparent text-ink-soft hover:border-ink/40",
            )}
          >
            {LABELS[f]}
            <span className="text-[10px] opacity-70">{counts[f] ?? 0}</span>
          </button>
        ))}
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
            />
          ))}
        </ul>
      )}
    </div>
  );
}
