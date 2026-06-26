import { redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { isSysadmin } from "@/lib/queries/sysadmin";
import { getCounterDrift } from "@/lib/queries/counter-drift";
import { CounterDriftTable } from "@/components/admin/counter-drift-table";

export const metadata = { title: "Diagnostics — Sysadmin" };
export const dynamic = "force-dynamic";

export default async function SysadminDiagnosticsPage() {
  if (!(await isSysadmin())) redirect("/admin");

  const drift = await getCounterDrift();

  return (
    <section className="container mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/admin/sysadmin"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Sysadmin
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Diagnostics
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Read-only health checks across the system. Drift is benign — it just
          means a denormalized counter has fallen out of sync.
        </p>
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Member count drift
          </h2>
          {drift.length > 0 && (
            <span className="text-xs text-clay">
              {drift.length} club{drift.length === 1 ? "" : "s"} out of sync
            </span>
          )}
        </div>
        <p className="mb-3 text-xs text-ink-soft">
          Compares <code className="font-mono">clubs.member_count</code> (manual
          override) against the actual count of rows in{" "}
          <code className="font-mono">club_members</code> for each active club.
          A recompute action will be added in 14c.
        </p>
        <CounterDriftTable rows={drift} />
      </section>
    </section>
  );
}
