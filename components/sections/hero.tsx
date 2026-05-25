import { Button } from "@/components/ui/button";
import { Icon, placeholderBg } from "@/components/ui/icon";
import { siteConfig } from "@/lib/site-config";
import type { SiteStats } from "@/lib/queries/home";

/**
 * Section 1 — Hero + Stats as ONE full-screen unit.
 *
 * Background: a photo mosaic that fully COVERS the section at any screen size
 * with NO gaps. We use a fixed column/row grid sized to the section (grid-rows
 * stretch via 1fr), and generate enough tiles (cols * rows) to always fill it.
 * Each tile is bg-cover so images crop, never distort, and stays individually
 * editable (one gallery URL per tile).
 *
 * Foreground: cream veil + wordmark + CTA + stats capsule, centered in 100svh.
 */

const COLS = 8; // columns across
const ROWS = 5; // rows down (5 * full-height fr always fills the screen)
const TILE_COUNT = COLS * ROWS;

export function Hero({
  images = [],
  stats,
}: {
  images?: string[];
  stats: SiteStats;
}) {
  // Repeat the available images across all tiles so every cell is filled.
  const tiles = Array.from({ length: TILE_COUNT }, (_, i) =>
    images.length ? images[i % images.length] : null,
  );

  const statItems = [
    { n: `${stats.clubs}+`, l: "Active clubs" },
    { n: `${stats.members.toLocaleString()}+`, l: "Members" },
    { n: `${stats.events}+`, l: "Events / year" },
    { n: `${stats.categories}`, l: "Categories" },
  ];

  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-24"
    >
      {/*
        COVER mosaic: absolute, fills the section. Fixed COLS x ROWS grid whose
        rows/cols each stretch to 1fr, so the grid always exactly covers the
        section with no leftover gap, on any screen size.
      */}
      <div
        className="absolute inset-0 grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
        aria-hidden
      >
        {tiles.map((url, i) => (
          <div
            key={i}
            className="h-full w-full rounded-[3px] bg-cover bg-center"
            style={
              url
                ? { backgroundImage: `url(${url})` }
                : { backgroundImage: placeholderBg(`hero-${i}`) }
            }
          />
        ))}
      </div>

      {/* cream veil */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(247,243,236,0.80) 0%, rgba(247,243,236,0.95) 70%)",
        }}
        aria-hidden
      />

      {/* hero content */}
      <div className="relative text-center">
        <p className="mb-2 text-xs font-medium text-ink-soft">
          {siteConfig.kicker}
        </p>
        <p className="font-display text-xl font-medium text-ink sm:text-2xl">
          Welcome to
        </p>
        <h1 className="my-1 font-display text-[clamp(2.75rem,12vw,4rem)] font-extrabold leading-none tracking-tightest text-ink">
          NITRR Clubs<span className="text-indigo">.</span>
        </h1>
        <p className="mb-6 text-[13px] tracking-[0.4em] text-ink-soft">raipur</p>
        <Button href="/clubs">
          Browse clubs <Icon name="arrow" size={16} />
        </Button>
      </div>

      {/* stats capsule — part of the hero screen */}
      <div className="relative mt-10 w-full max-w-3xl px-0 sm:px-2">
        <div className="flex items-center rounded-full border border-line bg-white px-1 py-3 shadow-soft sm:px-1.5 sm:py-3.5">
          {statItems.map((it, i) => (
            <div key={it.l} className="flex flex-1 items-center">
              {i > 0 && <div className="h-6 w-px bg-line" aria-hidden />}
              <div className="flex-1 text-center">
                <div className="text-base font-bold leading-none text-ink sm:text-xl">
                  {it.n}
                </div>
                <div className="mt-1 text-[9px] text-ink-soft sm:text-[10px]">
                  {it.l}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}