import Link from "next/link";
import { IconUsers, IconCalendar } from "@tabler/icons-react";
import { PHASE_BADGE, phaseLabel } from "@/lib/phase";
import { targetYearsLabel } from "@/components/admin/target-years-picker";
import type { DriveListItem } from "@/lib/queries/admin-drives";

/** One row in the drive list on /admin/clubs/[slug]/recruitment.
 *  Pure display — clicking "Manage" navigates to the drive editor. */
export function DriveListRow({
  drive,
  clubSlug,
}: {
  drive: DriveListItem;
  clubSlug: string;
}) {
  const dateLabel = formatDateLabel(drive);

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-ink/20">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <Link
            href={`/admin/clubs/${clubSlug}/recruitment/${drive.id}`}
            className="truncate font-display text-lg font-bold text-ink hover:text-indigo"
          >
            {drive.name}
          </Link>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="rounded-full bg-beige px-2 py-0.5 text-ink-soft">
            For {targetYearsLabel(drive.target_years)}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 ${PHASE_BADGE[drive.phase]}`}
          >
            {phaseLabel(drive.phase)}
          </span>
          {dateLabel && (
            <span className="inline-flex items-center gap-1 text-ink-soft">
              <IconCalendar size={11} /> {dateLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-4">
        <div className="text-center">
          <div className="inline-flex items-center gap-1 text-lg font-bold text-ink">
            <IconUsers size={14} className="text-ink-soft" />
            {drive.applicant_count}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-ink-soft">
            applicant{drive.applicant_count === 1 ? "" : "s"}
          </div>
        </div>

        <Link
          href={`/admin/clubs/${clubSlug}/recruitment/${drive.id}`}
          className="rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-ink/40 hover:bg-cream"
        >
          Manage
        </Link>
      </div>
    </div>
  );
}

function formatDateLabel(drive: DriveListItem): string | null {
  if (drive.phase === "draft") return null;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });

  if (drive.phase === "open" && drive.deadline) {
    return `Closes ${fmt(drive.deadline)}`;
  }
  if (drive.phase === "review" && drive.result_date) {
    return `Results by ${fmt(drive.result_date)}`;
  }
  if (drive.phase === "result" && drive.results_published_at) {
    return `Published ${fmt(drive.results_published_at)}`;
  }
  return null;
}
