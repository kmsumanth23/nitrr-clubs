import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { getEditableClub } from "@/lib/queries/admin";
import { getAuditLog } from "@/lib/queries/audit";
import { AuditLogView } from "@/components/admin/audit-log-view";
import type { AuditCategory } from "@/lib/audit/categorize";

export const metadata = { title: "Audit log — Admin" };
export const dynamic = "force-dynamic";

const PAGE_LIMIT = 50;

export default async function ClubAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    cat?: string;
    page?: string;
    cursor?: string;
  }>;
}) {
  const { slug } = await params;
  const data = await getEditableClub(slug);
  if (!data) notFound();
  const { club, tier } = data;

  // Editor doesn't see audit (same restriction as Applications/Members)
  if (tier === "editor") redirect(`/admin/clubs/${slug}`);

  const sp = await searchParams;
  const category = (sp.cat ?? "all") as AuditCategory;
  const cursor = sp.cursor ?? null;
  const page = parseInt(sp.page ?? "1", 10) || 1;

  const entries = await getAuditLog({
    category,
    clubId: club.id,
    cursor,
    limit: PAGE_LIMIT + 1,
  });
  const hasNext = entries.length > PAGE_LIMIT;
  const visible = hasNext ? entries.slice(0, PAGE_LIMIT) : entries;

  return (
    <section>
      <Link
        href={`/admin/clubs/${slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Edit {club.name}
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Every admin action on {club.name}.
        </p>
      </div>

      <AuditLogView
        entries={visible}
        page={page}
        hasNext={hasNext}
        category={category}
        selectedClubId={club.id}
        clubsForFilter={[]}
        fixedToClubSlug={slug}
      />
    </section>
  );
}
