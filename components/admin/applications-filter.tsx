"use client";

import * as React from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { ApplicationReviewRow } from "@/components/admin/application-review-row";
import type {
  AdminApplication,
  RecruitmentForAdmin,
  RecruitmentHistoryGroup,
} from "@/lib/queries/admin-applications";
import type { Phase } from "@/lib/phase";
import type { ApplicationStatus } from "@/lib/database.types";

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

/** Filter pills + list for one recruitment's applications. Used by the
 *  Current tab AND by each History group, so the rendering rule stays
 *  in one place. */
function FilterAndList({
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
}: {
  applications: AdminApplication[];
  counts: Record<Filter, number>;
  clubSlug: string;
  phase: Phase;
}) {
  return (
    <FilterAndList
      applications={applications}
      counts={counts}
      clubSlug={clubSlug}
      phase={phase}
    />
  );
}

/** One group on the History tab: a recruitment + its applications. */
function HistoryGroup({
  group,
  clubSlug,
  defaultOpen,
}: {
  group: RecruitmentHistoryGroup;
  clubSlug: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const { recruitment: rec, applications, counts } = group;

  return (
    <section className="rounded-2xl border border-line bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-cream"
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">
            {rec.name ?? "Recruitment"}
          </div>
          <div className="mt-0.5 text-xs text-ink-soft">
            {rec.deadline && (
              <>Closed {new Date(rec.deadline).toLocaleDateString("en-IN")}</>
            )}
            {rec.results_published_at && (
              <>
                {" · "}Published{" "}
                {new Date(rec.results_published_at).toLocaleDateString("en-IN")}
              </>
            )}
            {" · "}
            {counts.all} application{counts.all === 1 ? "" : "s"}
          </div>
        </div>
        <IconChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-line p-4">
          {/* History is always result-phase, so phase="result" */}
          <FilterAndList
            applications={applications}
            counts={counts}
            clubSlug={clubSlug}
            phase="result"
          />
        </div>
      )}
    </section>
  );
}

/** Tab switcher + Current view + History list. Receives the current view
 *  as children so the page can build its phase banner/publish panel
 *  server-side. */
export function ApplicationsTabsView({
  currentView,
  historyGroups,
  clubSlug,
}: {
  currentView: React.ReactNode;
  historyGroups: RecruitmentHistoryGroup[];
  clubSlug: string;
}) {
  const [tab, setTab] = React.useState<"current" | "history">("current");
  const hasHistory = historyGroups.length > 0;

  return (
    <>
      <div className="mb-6 inline-flex rounded-full border border-line bg-white p-1 text-xs">
        <button
          type="button"
          onClick={() => setTab("current")}
          className={
            "rounded-full px-4 py-1.5 transition-colors " +
            (tab === "current"
              ? "bg-ink text-cream"
              : "text-ink-soft hover:text-ink")
          }
        >
          Current
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={
            "rounded-full px-4 py-1.5 transition-colors " +
            (tab === "history"
              ? "bg-ink text-cream"
              : "text-ink-soft hover:text-ink")
          }
        >
          History{" "}
          {hasHistory && (
            <span className="ml-1 opacity-70">{historyGroups.length}</span>
          )}
        </button>
      </div>

      {tab === "current" ? (
        currentView
      ) : !hasHistory ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
          No prior recruitments. History will appear here after the next
          recruitment publishes.
        </p>
      ) : (
        <div className="space-y-3">
          {historyGroups.map((g, i) => (
            <HistoryGroup
              key={g.recruitment.id}
              group={g}
              clubSlug={clubSlug}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </>
  );
}