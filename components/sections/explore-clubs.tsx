import Link from "next/link";
import { placeholderBg } from "@/components/ui/icon";
import type { ClubWithCategory } from "@/lib/queries/home";

/**
 * Section — Explore clubs. FULL SCREEN.
 * Fluid grid: 1 col (mobile) -> 2 (tablet) -> 3 (desktop). With 5 clubs + the
 * terminal "All clubs" card = 6 items, desktop shows a clean 3 + 3.
 * Cards hold a square-ish ratio (255/215.66) but width is fluid (fills column).
 * Hover/focus: frosted overlay fades in with highlight bullets.
 */
export function ExploreClubs({ clubs }: { clubs: ClubWithCategory[] }) {
  return (
    <section
      id="clubs"
      className="flex min-h-[100svh] scroll-mt-20 flex-col items-center justify-center px-6 py-16"
    >
      <div className="mb-8 text-center">
        <h2 className="text-[27px] font-extrabold tracking-tight text-ink">
          Where do <span className="text-clay">you</span> belong?
        </h2>
        <p className="mt-1.5 text-[13px] text-ink-soft">
          Hover a club to see what they&apos;re about — tap to dive in
        </p>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {clubs.map((club) => {
          const color = club.category?.color ?? "#5B52E0";
          const cover = club.cover_url ?? club.logo_url;
          return (
            <Link
              key={club.id}
              href={`/clubs/${club.slug}`}
              tabIndex={0}
              className="group relative aspect-[255/215.66] w-full overflow-hidden rounded-2xl bg-cover bg-center"
              style={
                cover
                  ? { backgroundImage: `url(${cover})` }
                  : { backgroundImage: placeholderBg(club.id) }
              }
            >
              <span
                className="absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {club.category?.name ?? "Club"}
              </span>
              <div
                className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-0 group-focus:opacity-0"
                style={{
                  background:
                    "linear-gradient(transparent 45%, rgba(0,0,0,0.82))",
                }}
                aria-hidden
              />
              <h3 className="absolute bottom-3.5 left-3.5 z-10 text-[15px] font-medium text-white transition-opacity duration-300 group-hover:opacity-0 group-focus:opacity-0">
                {club.name}
              </h3>

              {/* frosted overlay — fades in on hover/focus */}
              <div className="absolute inset-0 flex flex-col bg-ink/70 p-4 opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100 group-focus:opacity-100">
                <h4 className="mb-2 text-sm font-semibold text-white">
                  {club.name}
                </h4>
                <ul className="flex-1 space-y-1.5">
                  {(club.highlights ?? []).slice(0, 4).map((h, i) => (
                    <li
                      key={i}
                      className="relative pl-3.5 text-[11px] leading-snug text-[#EAE7DF] before:absolute before:left-0 before:top-[6px] before:h-[5px] before:w-[5px] before:rounded-full before:bg-clay before:content-['']"
                    >
                      {h}
                    </li>
                  ))}
                </ul>
                <span className="text-[11px] font-medium text-white/90">
                  View club →
                </span>
              </div>
            </Link>
          );
        })}

        {/* VIEW ALL card — terminal CTA, same fluid footprint */}
        <Link
          href="/clubs"
          className="group relative flex aspect-[255/215.66] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-line bg-beige"
        >
          <span className="text-center font-display text-lg font-bold tracking-tight text-ink">
            Explore every
            <br />
            club &amp; committee
          </span>
          <span className="rounded-full bg-ink px-5 py-2 text-xs font-medium text-cream transition-colors group-hover:bg-indigo">
            All clubs →
          </span>
        </Link>
      </div>
    </section>
  );
}