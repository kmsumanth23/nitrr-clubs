import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { formatAuditEntry } from "@/lib/audit/format";
import { formatRelativeTime } from "@/lib/format/bytes";
import type { AuditEntry } from "@/lib/queries/audit";

export function ActivityFeedWidget({
  entries,
}: {
  entries: AuditEntry[];
}) {
  return (
    <div className="rounded-2xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="text-xs font-medium text-ink">Recent activity</span>
        <Link
          href="/admin/sysadmin/audit"
          className="inline-flex items-center gap-0.5 text-[11px] text-indigo hover:underline"
        >
          See all <IconArrowRight size={11} />
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-5 text-xs text-ink-soft">
          No admin actions yet. Activity will appear here.
        </p>
      ) : (
        <ul>
          {entries.map((entry) => {
            const { label, sentence } = formatAuditEntry(entry);
            return (
              <li
                key={entry.id}
                className="flex items-start gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
              >
                <span className="w-28 flex-shrink-0 pt-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-soft">
                  {label}
                </span>
                <div className="min-w-0 flex-1 text-xs text-ink">
                  {sentence}
                  {entry.target_club && (
                    <>
                      {" · "}
                      <Link
                        href={`/admin/clubs/${entry.target_club.slug}`}
                        className="text-indigo hover:underline"
                      >
                        {entry.target_club.name}
                      </Link>
                    </>
                  )}
                </div>
                <span className="flex-shrink-0 text-[10px] text-ink-soft">
                  {formatRelativeTime(entry.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
