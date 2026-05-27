import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconCalendar, IconMapPin } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { placeholderBg } from "@/components/ui/icon";
import { getEventBySlug, getAllEventSlugs } from "@/lib/queries/events";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getAllEventSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ev = await getEventBySlug(slug);
  if (!ev) return { title: "Event not found — NITRR Clubs" };
  return {
    title: `${ev.title} — NITRR Clubs`,
    description: ev.description ?? undefined,
  };
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "To be announced";
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ev = await getEventBySlug(slug);
  if (!ev) notFound();

  const color = ev.club?.category?.color ?? "#5B52E0";

  return (
    <article className="pb-20">
      <div
        className="relative flex h-[40vh] min-h-[280px] items-end bg-cover bg-center px-6 pb-8 pt-28"
        style={
          ev.poster_url
            ? { backgroundImage: `url(${ev.poster_url})` }
            : { backgroundImage: placeholderBg(ev.id) }
        }
      >
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(transparent 30%, rgba(0,0,0,0.85))" }}
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-3xl">
          <Link
            href="/events"
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white"
          >
            <IconArrowLeft size={14} /> All events
          </Link>
          {ev.club && (
            <Link href={`/clubs/${ev.club.slug}`}>
              <span
                className="mb-3 inline-block rounded-full px-3 py-1 text-[11px] font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {ev.club.name}
              </span>
            </Link>
          )}
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white">
            {ev.title}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex flex-wrap gap-5 text-sm text-ink">
          <span className="inline-flex items-center gap-2">
            <IconCalendar size={18} className="text-clay" />
            {fmtDateTime(ev.starts_at)}
          </span>
          {ev.venue && (
            <span className="inline-flex items-center gap-2">
              <IconMapPin size={18} className="text-clay" />
              {ev.venue}
            </span>
          )}
        </div>

        {ev.description && (
          <p className="mb-8 text-sm leading-relaxed text-ink-soft">
            {ev.description}
          </p>
        )}

        {ev.reg_open ? (
          ev.reg_url ? (
            <Button href={ev.reg_url}>Register now</Button>
          ) : (
            <Button href={ev.club ? `/clubs/${ev.club.slug}` : "/clubs"}>
              Register now
            </Button>
          )
        ) : (
          <div className="inline-block rounded-full border border-line bg-beige px-5 py-2.5 text-sm text-ink-soft">
            Registration closed
          </div>
        )}
      </div>
    </article>
  );
}
