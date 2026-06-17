import { redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { isSysadmin } from "@/lib/queries/sysadmin";
import { getAuditLog } from "@/lib/queries/audit";
import { getClubsForFilter } from "@/lib/clubs/list-for-filter";
import { AuditLogView } from "@/components/admin/audit-log-view";
import type { AuditCategory } from "@/lib/audit/categorize";

export const metadata = { title: "Audit log — Admin" };
export const dynamic = "force-dynamic";

const PAGE_LIMIT = 50;

export default async function SysadminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    cat?: string;
    club?: string;
    page?: string;
    cursor?: string;
  }>;
}) {
  if (!(await isSysadmin())) redirect("/admin");

  const sp = await searchParams;
  const category = (sp.cat ?? "all") as AuditCategory;
  const clubId = sp.club ?? null;
  const cursor = sp.cursor ?? null;
  const page = parseInt(sp.page ?? "1", 10) || 1;

  // Fetch limit+1 to detect "is there a next page"
  const entries = await getAuditLog({
    category,
    clubId,
    cursor,
    limit: PAGE_LIMIT + 1,
  });
  const hasNext = entries.length > PAGE_LIMIT;
  const visible = hasNext ? entries.slice(0, PAGE_LIMIT) : entries;

  const clubs = await getClubsForFilter(true);

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
          Audit log
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Append-only record of every admin action — who, what, where, when.
          Entries can&apos;t be edited or deleted.
        </p>
      </div>

      <AuditLogView
        entries={visible}
        page={page}
        hasNext={hasNext}
        category={category}
        selectedClubId={clubId}
        clubsForFilter={clubs}
      />
    </section>
  );
}
