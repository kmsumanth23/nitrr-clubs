import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconPlus } from "@tabler/icons-react";
import { getEditableClub } from "@/lib/queries/admin";
import { getEventsForClub } from "@/lib/queries/admin-events";
import { EventAdminRow } from "@/components/admin/event-row";

export const metadata = { title: "Events — Admin" };

export default async function AdminEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getEditableClub(slug);
  if (!data) notFound();

  const { club } = data;
  const events = await getEventsForClub(club.id);
  const now = Date.now();
  const upcoming = events.filter(
    (e) => !e.starts_at || new Date(e.starts_at).getTime() >= now,
  );
  const past = events.filter(
    (e) => e.starts_at && new Date(e.starts_at).getTime() < now,
  );

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
            Events
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Create, edit and delete events for {club.name}.
          </p>
        </div>
        <Link
          href={`/admin/clubs/${slug}/events/new`}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo px-4 py-2 text-sm font-medium text-indigo-fg hover:bg-indigo/90"
        >
          <IconPlus size={15} /> New event
        </Link>
      </div>

      {events.length === 0 && (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
          No events yet. Hit &quot;New event&quot; to add one.
        </p>
      )}

      {upcoming.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-bold text-ink">Upcoming</h2>
          <ul className="mb-8 space-y-2">
            {upcoming.map((ev) => (
              <EventAdminRow key={ev.id} ev={ev} clubSlug={slug} />
            ))}
          </ul>
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-bold text-ink">Past</h2>
          <ul className="space-y-2">
            {past.map((ev) => (
              <EventAdminRow key={ev.id} ev={ev} clubSlug={slug} past />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
