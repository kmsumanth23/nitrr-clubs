import Link from "next/link";
import { placeholderBg } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import type { ClubWithCategory } from "@/lib/queries/home";

/**
 * Section 4 — Explore clubs. Pure-CSS flip cards (no JS):
 * front = photo + name + category tag; back = highlights bullets + CTA.
 * Flip on hover via group-hover; respects prefers-reduced-motion globally.
 */
export function ExploreClubs({ clubs }: { clubs: ClubWithCategory[] }) {
  return (
    <section className="px-6 py-12">
      <div className="mb-7 text-center">
        <h2 className="text-[27px] font-extrabold tracking-tight text-ink">
          Where do <span className="text-clay">you</span> belong?
        </h2>
        <p className="mt-1.5 text-[13px] text-ink-soft">
          Hover a club to see what they&apos;re about — tap to dive in
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3">
        {clubs.map((club) => {
          const color = club.category?.color ?? "#5B52E0";
          const cover = club.cover_url ?? club.logo_url;
          return (
            <Link
              key={club.id}
              href={`/clubs/${club.slug}`}
              className="group block aspect-[3/4] [perspective:1000px]"
            >
              <div className="relative h-full w-full transition-transform duration-[600ms] [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] motion-reduce:transition-none motion-reduce:group-hover:[transform:none]">
                {/* FRONT */}
                <div
                  className="absolute inset-0 flex items-end overflow-hidden rounded-2xl bg-cover bg-center p-3.5 [backface-visibility:hidden]"
                  style={
                    cover
                      ? { backgroundImage: `url(${cover})` }
                      : { backgroundImage: placeholderBg(club.id) }
                  }
                >
                  <span
                    className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-medium text-white"
                    style={{ backgroundColor: color }}
                  >
                    {club.category?.name ?? "Club"}
                  </span>
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(transparent 40%, rgba(0,0,0,0.8))",
                    }}
                    aria-hidden
                  />
                  <h3 className="relative text-[15px] font-medium text-white">
                    {club.name}
                  </h3>
                </div>

                {/* BACK */}
                <div className="absolute inset-0 flex flex-col rounded-2xl bg-ink p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <h4 className="mb-2.5 text-sm font-semibold text-white">
                    {club.name}
                  </h4>
                  <ul className="flex-1 space-y-1.5">
                    {(club.highlights ?? []).slice(0, 4).map((h, i) => (
                      <li
                        key={i}
                        className="relative pl-3.5 text-[10.5px] leading-snug text-[#D6D2C8] before:absolute before:left-0 before:top-[5px] before:h-[5px] before:w-[5px] before:rounded-full before:bg-clay before:content-['']"
                      >
                        {h}
                      </li>
                    ))}
                  </ul>
                  <span className="rounded-full bg-white py-1.5 text-center text-[11px] font-medium text-ink">
                    View club →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <Button href="/clubs" variant="outline">
          Explore all clubs →
        </Button>
      </div>
    </section>
  );
}
