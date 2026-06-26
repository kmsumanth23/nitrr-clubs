import Link from "next/link";
import { formatBytes, formatRelativeTime } from "@/lib/format/bytes";
import type {
  StorageUsageRow,
  LargestPhotoRow,
} from "@/lib/queries/storage-usage";

export function StorageUsagePerClubTable({
  rows,
}: {
  rows: StorageUsageRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-white px-4 py-6 text-sm text-ink-soft">
        No photos uploaded yet.
      </p>
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
              Photos
            </th>
            <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              Size
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.club_slug}
              className="border-b border-line last:border-b-0"
            >
              <td className="px-4 py-2.5">
                <div className="text-sm text-ink">
                  {r.club_name ?? (
                    <span className="text-ink-soft italic">
                      Orphan: no club for &ldquo;{r.club_slug}&rdquo;
                    </span>
                  )}
                </div>
                <div className="font-mono text-[10px] text-ink-soft">
                  /{r.club_slug}
                </div>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">
                {r.file_count}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                {formatBytes(r.total_bytes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LargestPhotosTable({ rows }: { rows: LargestPhotoRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-white px-4 py-6 text-sm text-ink-soft">
        No photos to show.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-cream">
          <tr>
            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              Path
            </th>
            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              Club
            </th>
            <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              Size
            </th>
            <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              Uploaded
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.path}
              className="border-b border-line last:border-b-0"
            >
              <td className="max-w-xs truncate px-4 py-2.5 font-mono text-[11px] text-ink-soft">
                {r.path}
              </td>
              <td className="px-4 py-2.5 text-sm text-ink">
                {r.club_name ? (
                  <Link
                    href={`/admin/clubs/${r.club_slug}/gallery`}
                    className="text-indigo hover:underline"
                  >
                    {r.club_name}
                  </Link>
                ) : (
                  <span className="text-ink-soft italic">orphan</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                {formatBytes(r.bytes)}
              </td>
              <td className="px-4 py-2.5 text-right text-[11px] text-ink-soft">
                {formatRelativeTime(r.uploaded_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
