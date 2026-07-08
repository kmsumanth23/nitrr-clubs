import Link from "next/link";
import { notFound } from "next/navigation";
import { IconPlus, IconClipboardList } from "@tabler/icons-react";
import { getEditableClub } from "@/lib/queries/admin";
import { listDrivesForClub } from "@/lib/queries/admin-drives";
import { DriveListRow } from "@/components/admin/drive-list-row";

/**
 * Admin recruitment page — now a LIST of drives (16A).
 * Was a single-recruitment editor via <RecruitmentSection> (pre-16A).
 */
export default async function AdminClubRecruitmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const editable = await getEditableClub(slug);
  if (!editable) notFound();

  const drives = await listDrivesForClub(editable.club.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Recruitment drives
          </h1>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            Run as many drives as you need — each targets specific college
            years, and only those years can apply.
          </p>
        </div>
        <Link
          href={`/admin/clubs/${slug}/recruitment/new`}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo px-4 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90"
        >
          <IconPlus size={14} /> New drive
        </Link>
      </header>

      {drives.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cream text-ink-soft">
            <IconClipboardList size={22} />
          </div>
          <h2 className="font-display text-lg font-bold text-ink">
            No drives yet
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
            Start recruiting by creating your first drive. You can save it as
            a draft and publish when ready.
          </p>
          <Link
            href={`/admin/clubs/${slug}/recruitment/new`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90"
          >
            <IconPlus size={14} /> Create first drive
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {drives.map((d) => (
            <DriveListRow key={d.id} drive={d} clubSlug={slug} />
          ))}
        </div>
      )}
    </div>
  );
}
