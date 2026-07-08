import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { getEditableClub } from "@/lib/queries/admin";
import { getDriveWithQuestions } from "@/lib/queries/admin-drives";
import { DriveEditorForm } from "@/components/admin/drive-editor-form";

/**
 * Edit an existing drive.
 * Auth: getEditableClub gates the club-level admin check.
 * Extra guard: the drive must belong to this club (defensive; the RPCs
 * enforce this too, but 404 is friendlier UX than an authorization error).
 */
export default async function EditDrivePage({
  params,
}: {
  params: Promise<{ slug: string; driveId: string }>;
}) {
  const { slug, driveId } = await params;

  const editable = await getEditableClub(slug);
  if (!editable) notFound();

  const drive = await getDriveWithQuestions(driveId);
  if (!drive) notFound();

  // Defensive: drive must belong to this club
  if (drive.club_id !== editable.club.id) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <Link
          href={`/admin/clubs/${slug}/recruitment`}
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
        >
          <IconArrowLeft size={12} /> All drives
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink">
          Edit drive
        </h1>
      </div>

      <DriveEditorForm
        mode="edit"
        clubId={editable.club.id}
        clubSlug={slug}
        drive={drive}
      />
    </div>
  );
}
