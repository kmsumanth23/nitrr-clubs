"use client";

import * as React from "react";
import Link from "next/link";
import { formatAuditEntry } from "@/lib/audit/format";
import type { AuditEntry } from "@/lib/queries/audit";

export function AuditEntryRow({
  entry,
  hideClubLink,
}: {
  entry: AuditEntry;
  hideClubLink?: boolean;
}) {
  const { label, sentence } = formatAuditEntry(entry);
  const when = new Date(entry.created_at);
  const dateText = when.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  const timeText = when.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <li className="flex flex-wrap items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <div className="flex w-32 flex-shrink-0 items-center">
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">
          {label}
        </span>
      </div>

      <div className="min-w-0 flex-1 text-sm text-ink">
        {sentence}
        {!hideClubLink && entry.target_club && (
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

      <div className="flex-shrink-0 text-xs text-ink-soft">
        {dateText}, {timeText}
      </div>
    </li>
  );
}
