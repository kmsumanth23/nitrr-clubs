import Link from "next/link";
import { IconCalendar, IconMapPin } from "@tabler/icons-react";
import { placeholderBg } from "@/components/ui/icon";
import { getAllEvents } from "@/lib/queries/events";

export const revalidate = 60;

export const metadata = {
  title: "Events — NITRR Clubs",
  description: "Upcoming and past events across all clubs at NIT Raipur.",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "TBA";
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default async function EventsPage() {
  const events = await getAllEvents();
  const now = Date.now();
  const upcoming = events.filter(
    (e) => !e.starts_at || new Date(e.starts_at).getTime() >= now,
  );
  const past = events.filter(
    (e) => e.starts_at && new Date(e.starts_at).getTime() < now,
  );

  return (
    <section className="mx-auto max-w-4xl px-6 pb-20 pt-28">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Events
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          What&apos;s happening across clubs at NIT Raipur
        </p>
      </div>

      {upcoming.length > 0 && (
        <>
          <h2 className="mb-4 text-lg font-bold text-ink">Upcoming</h2>
          <div className="mb-12 grid gap-4 sm:grid-cols-2">
            {upcoming.map((ev) => (
              <EventCard key={ev.id} ev={ev} />
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mb-4 text-lg font-bold text-ink">Past events</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {past.map((ev) => (
              <EventCard key={ev.id} ev={ev} past />
            ))}
          </div>
        </>
      )}

      {events.length === 0 && (
        <p className="py-16 text-center text-sm text-ink-soft">
          No events scheduled yet. Check back soon.
        </p>
      )}
    </section>
  );
}

function EventCard({
  ev,
  past,
}: {
  ev: Awaited<ReturnType<typeof getAllEvents>>[number];
  past?: boolean;
}) {
  const color = ev.club?.category?.color ?? "#5B52E0";
  return (
    <Link
      href={`/events/${ev.slug}`}
      className={`group overflow-hidden rounded-2xl border border-line bg-white transition-colors hover:border-ink/30 ${
        past ? "opacity-75" : ""
      }`}
    >
      <div
        className="relative h-32 bg-cover bg-center"
        style={
          ev.poster_url
            ? { backgroundImage: `url(${ev.poster_url})` }
            : { backgroundImage: placeholderBg(ev.id) }
        }
      >
        {ev.club && (
          <span
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-medium text-white"
            style={{ backgroundColor: color }}
          >
            {ev.club.name}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-ink">{ev.title}</h3>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <IconCalendar size={13} /> {fmtDate(ev.starts_at)}
          </span>
          {ev.venue && (
            <span className="inline-flex items-center gap-1">
              <IconMapPin size={13} /> {ev.venue}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
