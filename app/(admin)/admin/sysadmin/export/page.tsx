import { redirect } from "next/navigation";
import Link from "next/link";
import {
  IconArrowLeft,
  IconUsers,
  IconUserStar,
} from "@tabler/icons-react";
import { isSysadmin } from "@/lib/queries/sysadmin";
import { ExportCsvButton } from "@/components/admin/export-csv-button";

export const metadata = { title: "Export — Admin" };

export default async function SysadminExportPage() {
  if (!(await isSysadmin())) redirect("/admin");

  return (
    <section className="container mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/admin/sysadmin"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Sysadmin
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Data export
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Download CSV files of system-wide data. Use the Anonymize PII toggle
          when sharing files outside the club leadership.
        </p>
      </div>

      <div className="space-y-3">
        <section className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-start gap-3">
            <IconUsers size={20} className="mt-0.5 text-ink-soft" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-ink">All members</h3>
              <p className="mt-0.5 mb-3 text-xs text-ink-soft">
                Every entry in club_members across all active clubs, joined
                with the member&apos;s profile.
              </p>
              <ExportCsvButton
                href="/admin/api/export/all-members"
                label="Download all members"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-start gap-3">
            <IconUserStar size={20} className="mt-0.5 text-ink-soft" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-ink">All admins</h3>
              <p className="mt-0.5 mb-3 text-xs text-ink-soft">
                Every entry in club_admins across all clubs, with tier and
                profile details.
              </p>
              <ExportCsvButton
                href="/admin/api/export/all-admins"
                label="Download all admins"
              />
            </div>
          </div>
        </section>
      </div>

      <p className="mt-8 text-xs text-ink-soft">
        Per-club CSVs are available from each club&apos;s Members and Admins
        pages.
      </p>
    </section>
  );
}
