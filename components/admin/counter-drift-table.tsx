import Link from "next/link";
import { RecomputeButton } from "@/components/admin/recompute-button";
import type { CounterDriftRow } from "@/lib/queries/counter-drift";

export function CounterDriftTable({ rows }: { rows: CounterDriftRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white px-4 py-6">
        <p className="text-sm text-ink">
          ✓ All member counts are in sync.
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          Every active club&apos;s manual <code className="font-mono">member_count</code>{" "}
          matches the actual row count in <code className="font-mono">club_members</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-cream">
          <tr>
            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              Club
            </th>
            <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              Manual
            </th>
            <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              Actual
            </th>
            <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              Drift
            </th>
            <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              Fix
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.club_id} className="border-b border-line last:border-b-0">
              <td className="px-4 py-2.5">
                <Link
                  href={`/admin/clubs/${r.slug}`}
                  className="text-sm text-ink hover:text-indigo hover:underline"
                >
                  {r.name}
                </Link>
                <div className="font-mono text-[10px] text-ink-soft">
                  /{r.slug}
                </div>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">
                {r.manual_count}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">
                {r.actual_count}
              </td>
              <td className="px-4 py-2.5 text-right">
                <span
                  className={
                    "inline-flex tabular-nums rounded-full px-2 py-0.5 text-[11px] font-medium " +
                    (r.drift > 0
                      ? "bg-clay/10 text-clay"
                      : "bg-indigo/10 text-indigo")
                  }
                >
                  {r.drift > 0 ? "+" : ""}
                  {r.drift}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">
                <RecomputeButton clubId={r.club_id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
