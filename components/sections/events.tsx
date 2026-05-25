import Link from "next/link";
import { placeholderBg } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import type { EventRow } from "@/lib/database.types";

/**
 * Section — Events. FULL SCREEN. Upright, overlapping graduated-height posters
 * (center tallest & frontmost). Always 5 (display only — real events on /events).
 *
 * Hover: a SLIGHT rotation that splays outward — left posters tilt left
 * (counter-clockwise), right posters tilt right (clockwise). No pop/scale.
 *
 * ── TWEAKS ────────────────────────────────────────────────
 *  Width  : w-[130px] sm:w-[220px]  (in cnPoster)
 *  Overlap: -ml-9 sm:-ml-14         (in cnPoster)
 *  Tilt   : ROTATE[] below (degrees per poster, index 0..4)
 * ──────────────────────────────────────────────────────────
 */

const HEIGHTS = ["h-[70%]", "h-[85%]", "h-full", "h-[85%]", "h-[70%]"];
const Z = ["z-[1]", "z-[2]", "z-[3]", "z-[2]", "z-[1]"];
// outward splay on hover: left two tilt left, center none, right two tilt right
const ROTATE = [
  "hover:-rotate-6",
  "hover:-rotate-3",
  "hover:rotate-0",
  "hover:rotate-3",
  "hover:rotate-6",
];

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

export function Events({ events }: { events: EventRow[] }) {
  const posters = events.slice(0, 5);

  return (
    <section
      id="events"
      className="flex min-h-[100svh] scroll-mt-20 flex-col items-center justify-center px-6 py-16"
    >
      <div className="mb-10 text-center">
        <h2 className="text-[27px] font-extrabold tracking-tight text-ink">
          Events this month
        </h2>
        <p className="mt-1.5 text-[13px] text-ink-soft">
          There&apos;s always something happening on campus
        </p>
      </div>

      <div className="mb-12 flex h-[320px] w-full max-w-5xl items-center justify-center sm:h-[460px]">
        {posters.map((ev, i) => (
          <Link
            key={ev.id}
            href={`/events/${ev.slug}`}
            className={cnPoster(i)}
            style={
              ev.poster_url
                ? { backgroundImage: `url(${ev.poster_url})` }
                : { backgroundImage: placeholderBg(ev.id) }
            }
          >
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(transparent 45%, rgba(0,0,0,0.72))",
              }}
              aria-hidden
            />
            <div className="relative">
              <div className="text-xs font-semibold leading-tight text-white sm:text-sm">
                {ev.title}
              </div>
              <div className="mt-0.5 text-[10px] text-white/80 sm:text-[11px]">
                {fmtDate(ev.starts_at)}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex justify-center gap-2.5">
        <Button href="/events" size="sm">
          Register now
        </Button>
        <Button href="/events" size="sm" variant="outline">
          All events →
        </Button>
      </div>
    </section>
  );
}

function cnPoster(i: number): string {
  const overlap = i === 0 ? "" : "-ml-9 sm:-ml-14";
  return [
    "group relative flex items-end overflow-hidden rounded-2xl border-[3px] border-cream bg-cover bg-center p-3 shadow-lift",
    "w-[130px] sm:w-[220px]",
    "origin-bottom transition-transform duration-300",
    HEIGHTS[i],
    Z[i],
    ROTATE[i],
    overlap,
  ].join(" ");
}