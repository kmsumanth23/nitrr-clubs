"use client";

import Link from "next/link";
import {
  IconCheck,
  IconX,
  IconExternalLink,
} from "@tabler/icons-react";
import type { BulkImportReport } from "@/lib/actions/bulk-import";

export function BulkImportResultView({ report }: { report: BulkImportReport }) {
  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-line bg-white p-3">
          <div className="text-2xl font-extrabold text-ink tabular-nums">
            {report.total}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-soft">
            Rows processed
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-3">
          <div className="text-2xl font-extrabold text-indigo tabular-nums">
            {report.succeeded}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-soft">
            Succeeded
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-3">
          <div
            className={
              "text-2xl font-extrabold tabular-nums " +
              (report.failed > 0 ? "text-clay" : "text-ink-soft")
            }
          >
            {report.failed}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-soft">
            Failed
          </div>
        </div>
      </div>

      {/* Per-row table */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-cream">
            <tr>
              <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                Row
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                Club
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                Status
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                Result
              </th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <tr
                key={r.row_number}
                className="border-b border-line last:border-b-0"
              >
                <td className="px-4 py-2.5 font-mono text-[11px] text-ink-soft">
                  {r.row_number}
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-sm text-ink">{r.name || "—"}</div>
                  {r.slug && (
                    <div className="font-mono text-[10px] text-ink-soft">
                      /{r.slug}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {r.status === "success" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo/10 px-2 py-0.5 text-[11px] font-medium text-indigo">
                      <IconCheck size={11} /> Success
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-clay/10 px-2 py-0.5 text-[11px] font-medium text-clay">
                      <IconX size={11} /> Failed
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {r.status === "success" ? (
                    <Link
                      href={`/clubs/${r.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-0.5 text-xs text-indigo hover:underline"
                    >
                      View <IconExternalLink size={11} />
                    </Link>
                  ) : (
                    <span className="text-xs text-clay">{r.error}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
