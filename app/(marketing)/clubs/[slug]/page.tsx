import { notFound } from "next/navigation";
import Link from "next/link";
import {
  IconCalendar,
  IconMapPin,
  IconArrowLeft,
  IconArchive,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { placeholderBg } from "@/components/ui/icon";
import {
  getClubBySlug,
  getArchivedClubBySlug,
  getAllClubSlugs,
} from "@/lib/queries/clubs";

export const revalidate = 60; // ISR

// Pre-render every club page at build time (SSG), then ISR keeps them fresh.
export async function generateStaticParams() {
  const slugs = await getAllClubSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (club) {
    return {
      title: `${club.name} — NITRR Clubs`,
      description: club.tagline ?? club.description ?? undefined,
    };
  }

  const archived = await getArchivedClubBySlug(slug);
  if (archived) {
    return {
      title: `${archived.name} (decommissioned) — NITRR Clubs`,
      description: `${archived.name} has been decommissioned.`,
      robots: { index: false, follow: false },
    };
  }

  return { title: "Club not found — NITRR Clubs" };
}

function fmtDate(iso: string | null): string {
  if (!iso) return "TBA";
  return new Date(iso).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) {
    const archived = await getArchivedClubBySlug(slug);
    if (archived) {
      return <DecommissionedClubPage archived={archived} />;
    }
    notFound();
  }

  const color = club.category?.color ?? "#5B52E0";
  const cover = club.cover_url ?? club.logo_url;

  return (
    <article className="pb-20">
      {/* COVER */}
      <div
        className="relative flex h-[42vh] min-h-[300px] items-end bg-cover bg-center px-6 pb-8 pt-28"
        style={
          cover
            ? { backgroundImage: `url(${cover})` }
            : { backgroundImage: placeholderBg(club.id) }
        }
      >
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(transparent 30%, rgba(0,0,0,0.85))" }}
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-4xl">
          <Link
            href="/clubs"
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white"
          >
            <IconArrowLeft size={14} /> All clubs
          </Link>
          <span
            className="mb-3 inline-block rounded-full px-3 py-1 text-[11px] font-medium text-white"
            style={{ backgroundColor: color }}
          >
            {club.category?.name ?? "Club"}
          </span>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white">
            {club.name}
          </h1>
          {club.tagline && (
            <p className="mt-1 text-sm text-white/85">{club.tagline}</p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6">
        {/* ABOUT + APPLY */}
        <div className="grid gap-8 py-10 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">About</h2>
            <p className="text-sm leading-relaxed text-ink-soft">
              {club.description ?? "More about this club coming soon."}
            </p>

            {(club.highlights?.length ?? 0) > 0 && (
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {(club.highlights ?? []).map((h, i) => (
                  <li
                    key={i}
                    className="relative rounded-xl border border-line bg-white px-4 py-3 pl-8 text-sm text-ink before:absolute before:left-3.5 before:top-[18px] before:h-1.5 before:w-1.5 before:rounded-full before:bg-clay before:content-['']"
                  >
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* APPLY CARD */}
          <aside className="h-fit rounded-2xl border border-line bg-beige p-5 md:w-60">
            <div className="mb-1 text-2xl font-bold text-ink">
              {club.member_count ?? 0}
            </div>
            <div className="mb-4 text-xs text-ink-soft">active members</div>
            {club.is_recruiting ? (
              <>
                <Button href={`/clubs/${club.slug}/apply`} className="w-full">
                  Apply to join
                </Button>
                <p className="mt-2 text-center text-[11px] text-ink-soft">
                  Recruitment is open
                </p>
              </>
            ) : (
              <div className="rounded-xl bg-white px-4 py-3 text-center text-xs text-ink-soft">
                Recruitment is currently closed
              </div>
            )}
          </aside>
        </div>

        {/* TEAM */}
        {club.team.length > 0 && (
          <section className="border-t border-line py-10">
            <h2 className="mb-5 text-lg font-bold text-ink">The team</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {club.team.map((member) => (
                <div key={member.id} className="text-center">
                  <div
                    className="mx-auto mb-2 h-20 w-20 rounded-full bg-cover bg-center"
                    style={
                      member.photo_url
                        ? { backgroundImage: `url(${member.photo_url})` }
                        : { backgroundImage: placeholderBg(member.id) }
                    }
                  />
                  <div className="text-sm font-medium text-ink">
                    {member.name}
                  </div>
                  {member.role && (
                    <div className="text-xs text-ink-soft">{member.role}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* EVENTS */}
        {club.events.length > 0 && (
          <section className="border-t border-line py-10">
            <h2 className="mb-5 text-lg font-bold text-ink">Events</h2>
            <div className="space-y-3">
              {club.events.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/events/${ev.slug}`}
                  className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-ink/30"
                >
                  <div
                    className="h-14 w-14 flex-shrink-0 rounded-xl bg-cover bg-center"
                    style={
                      ev.poster_url
                        ? { backgroundImage: `url(${ev.poster_url})` }
                        : { backgroundImage: placeholderBg(ev.id) }
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">
                      {ev.title}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-ink-soft">
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
                  {ev.reg_open && (
                    <span className="flex-shrink-0 rounded-full bg-sport-soft px-2.5 py-1 text-[10px] font-medium text-sport">
                      Open
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* GALLERY */}
        {club.gallery.length > 0 && (
          <section className="border-t border-line py-10">
            <h2 className="mb-5 text-lg font-bold text-ink">Gallery</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {club.gallery.map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-[4/3] rounded-xl bg-cover bg-center"
                  style={{ backgroundImage: `url(${photo.image_url})` }}
                  title={photo.caption ?? undefined}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}

function DecommissionedClubPage({
  archived,
}: {
  archived: {
    name: string;
    slug: string;
    tagline: string | null;
    archived_at: string;
    category: { name: string; color: string | null } | null;
  };
}) {
  const archivedDate = new Date(archived.archived_at).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <article className="container mx-auto max-w-2xl px-4 py-20 sm:py-32">
      <Link
        href="/clubs"
        className="mb-8 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> All clubs
      </Link>

      <div className="rounded-3xl border border-line bg-white p-8 text-center sm:p-12">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-clay/10 text-clay">
          <IconArchive size={22} />
        </div>

        {archived.category?.name && (
          <span className="mb-3 inline-block rounded-full bg-cream px-3 py-1 text-[11px] font-medium text-ink-soft">
            {archived.category.name}
          </span>
        )}

        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {archived.name}
        </h1>

        {archived.tagline && (
          <p className="mt-2 text-sm text-ink-soft">{archived.tagline}</p>
        )}

        <div className="mx-auto mt-6 max-w-md">
          <p className="text-sm text-ink">
            This club has been{" "}
            <span className="font-semibold text-clay">decommissioned</span>.
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Archived on {archivedDate}. The club is no longer active and is
            not accepting applications.
          </p>
        </div>

        <div className="mt-8">
          <Button href="/clubs">Browse active clubs</Button>
        </div>
      </div>
    </article>
  );
}
