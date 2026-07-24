import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { getEditableClub } from "@/lib/queries/admin";
import { getMembersGroupedByRole } from "@/lib/queries/admin-members";
import { MemberRow } from "@/components/admin/member-row";
import { BulkPromoteModal } from "@/components/admin/bulk-promote-modal";
import { ExportCsvButton } from "@/components/admin/export-csv-button";
import { isSysadmin } from "@/lib/queries/sysadmin";
import { ROLE_DEFAULT_LABELS } from "@/lib/roles";

export const metadata = { title: "Members — Admin" };

export default async function AdminMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [data, isSuper] = await Promise.all([
    getEditableClub(slug),
    isSysadmin(),
  ]);
  if (!data) notFound();
  const { club, tier } = data;

  // Members hidden from editor
  if (tier === "editor") redirect(`/admin/clubs/${slug}`);

  const groups = await getMembersGroupedByRole(club.id);
  const memberCount = groups.reduce((n, g) => n + g.members.length, 0);
  const canPromote = tier === "lead" || isSuper;

  return (
    <section>
      <Link
        href={`/admin/clubs/${slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Edit {club.name}
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Members
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {club.name}&apos;s roster. Accepted applicants land here when
            results are published.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BulkPromoteModal
            groups={groups}
            clubId={club.id}
            clubSlug={slug}
            canPromote={canPromote}
          />
          <ExportCsvButton
            href={`/admin/api/export/club-roster?slug=${slug}`}
            label="Export CSV"
          />
        </div>
      </div>

      {memberCount === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
          No members yet. Members appear here once a recruitment is published
          with accepted applications.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.role}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {ROLE_DEFAULT_LABELS[g.role]} ({g.members.length})
              </h3>
              <ul className="space-y-2">
                {g.members.map((m) => (
                  <MemberRow
                    key={m.profile_id}
                    member={m}
                    clubId={club.id}
                    clubSlug={slug}
                    viewerTier={tier}
                    viewerIsSuper={isSuper}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
