import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { getEditableClub } from "@/lib/queries/admin";
import { getEventByIdForClub } from "@/lib/queries/admin-events";
import { EventForm } from "@/components/admin/event-form";

export const metadata = { title: "Edit event — Admin" };

export default async function AdminEditEventPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const data = await getEditableClub(slug);
  if (!data) notFound();

  const { club } = data;
  const ev = await getEventByIdForClub(id, club.id);
  if (!ev) notFound();

  return (
    <section>
      <Link
        href={`/admin/clubs/${slug}/events`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Events
      </Link>

      <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-ink">
        Edit event
      </h1>

      <EventForm mode="edit" clubId={club.id} clubSlug={slug} event={ev} />
    </section>
  );
}
