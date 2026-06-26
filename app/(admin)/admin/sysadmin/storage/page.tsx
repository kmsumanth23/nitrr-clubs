import { redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { isSysadmin } from "@/lib/queries/sysadmin";
import { getStorageUsageReport } from "@/lib/queries/storage-usage";
import { formatBytes } from "@/lib/format/bytes";
import {
  StorageUsagePerClubTable,
  LargestPhotosTable,
} from "@/components/admin/storage-usage-table";

export const metadata = { title: "Storage — Sysadmin" };
export const dynamic = "force-dynamic";

// Supabase free tier limit. Update if you upgrade plan.
const FREE_TIER_BYTES = 1024 * 1024 * 1024; // 1 GB

export default async function SysadminStoragePage() {
  if (!(await isSysadmin())) redirect("/admin");

  const report = await getStorageUsageReport();
  const percentUsed = Math.min(
    100,
    (report.total_bytes / FREE_TIER_BYTES) * 100,
  );

  // Color tier for the meter
  let meterColor = "bg-indigo";
  if (percentUsed > 90) meterColor = "bg-clay";
  else if (percentUsed > 70) meterColor = "bg-amber-500";

  return (
    <section className="container mx-auto max-w-5xl px-4 py-10">
      <Link
        href="/admin/sysadmin"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Sysadmin
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Storage usage
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Gallery photos across all clubs, sized against the Supabase free tier
          quota.
        </p>
      </div>

      {/* Bucket meter */}
      <section className="mb-8">
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-extrabold tabular-nums text-ink">
                {formatBytes(report.total_bytes)}
                <span className="ml-2 text-sm font-normal text-ink-soft">
                  / {formatBytes(FREE_TIER_BYTES)}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-ink-soft">
                {report.total_files} file{report.total_files === 1 ? "" : "s"}{" "}
                in <code className="font-mono">club-gallery</code> bucket
              </div>
            </div>
            <div className="text-sm font-medium tabular-nums text-ink">
              {percentUsed.toFixed(1)}%
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div
              className={meterColor + " h-full rounded-full transition-all"}
              style={{ width: `${percentUsed}%` }}
            />
          </div>

          {percentUsed > 70 && (
            <p className="mt-3 text-xs text-clay">
              {percentUsed > 90
                ? "Warning — bucket nearly full. Consider upgrading or pruning."
                : "Bucket is filling up. Worth keeping an eye on."}
            </p>
          )}
        </div>
      </section>

      {/* Per-club breakdown */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">
          By club
        </h2>
        <StorageUsagePerClubTable rows={report.per_club} />
      </section>

      {/* Photos above the 500 KB threshold */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">
          Photos &gt; 500 KB
        </h2>
        <LargestPhotosTable rows={report.largest} />
      </section>
    </section>
  );
}
