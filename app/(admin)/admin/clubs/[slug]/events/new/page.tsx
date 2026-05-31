import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { getEditableClub } from "@/lib/queries/admin";
import { EventForm } from "@/components/admin/event-form";

export const metadata = { title: "New event — Admin" };

export default async function AdminNewEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getEditableClub(slug);
  if (!data) notFound();

  const { club } = data;

  return (
    <section>
      <Link
        href={`/admin/clubs/${slug}/events`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Events
      </Link>

      <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-ink">
        New event
      </h1>

      <EventForm mode="create" clubId={club.id} clubSlug={slug} />
    </section>
  );
}
