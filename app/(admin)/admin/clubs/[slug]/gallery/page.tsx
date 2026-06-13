import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { getEditableClub } from "@/lib/queries/admin";
import { getGalleryForClub } from "@/lib/queries/admin-gallery";
import { GalleryManager } from "@/components/admin/gallery-manager";

export const metadata = { title: "Gallery — Admin" };

export default async function AdminGalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getEditableClub(slug);
  if (!data) notFound();
  const { club } = data;

  const photos = await getGalleryForClub(club.id);

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
          Gallery
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Photos for {club.name}. Drag-and-drop to upload, edit captions, and
          control which photos appear on the homepage.
        </p>
      </div>

      <GalleryManager
        clubId={club.id}
        clubSlug={slug}
        photos={photos}
      />
    </section>
  );
}
