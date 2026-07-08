import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { getEditableClub } from "@/lib/queries/admin";
import { DriveEditorForm } from "@/components/admin/drive-editor-form";

/**
 * Create a new recruitment drive.
 * Renders <DriveEditorForm mode="create"> — on save, action redirects to
 * the edit page for the new drive.
 */
export default async function NewDrivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const editable = await getEditableClub(slug);
  if (!editable) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <Link
          href={`/admin/clubs/${slug}/recruitment`}
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
        >
          <IconArrowLeft size={12} /> All drives
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink">New drive</h1>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">
          Define the window, who can apply, and the questions. You&apos;ll be
          able to edit questions and publish from the next screen.
        </p>
      </div>

      <DriveEditorForm
        mode="create"
        clubId={editable.club.id}
        clubSlug={slug}
      />
    </div>
  );
}
