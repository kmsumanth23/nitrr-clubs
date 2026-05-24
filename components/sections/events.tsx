import Link from "next/link";
import { placeholderBg } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import type { EventRow } from "@/lib/database.types";

/** Fan transforms for up to 5 posters, center featured. */
const FAN = [
  "rotate-[-22deg] -translate-x-[184px] scale-90 z-[1]",
  "rotate-[-11deg] -translate-x-[94px] scale-95 z-[2]",
  "rotate-0 scale-105 z-[3]",
  "rotate-[11deg] translate-x-[94px] scale-95 z-[2]",
  "rotate-[22deg] translate-x-[184px] scale-90 z-[1]",
];

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

/** Section 6 — Events. Fanned poster stack. */
export function Events({ events }: { events: EventRow[] }) {
  const posters = events.slice(0, 5);

  return (
    <section className="px-6 py-12">
      <div className="mb-7 text-center">
        <h2 className="text-[27px] font-extrabold tracking-tight text-ink">
          Events this month
        </h2>
        <p className="mt-1.5 text-[13px] text-ink-soft">
          There&apos;s always something happening on campus
        </p>
      </div>

      <div className="relative mb-6 flex h-[260px] items-center justify-center">
        {posters.map((ev, i) => (
          <Link
            key={ev.id}
            href={`/events/${ev.slug}`}
            className={`absolute flex h-[188px] w-[136px] items-end rounded-2xl border-[3px] border-cream bg-cover bg-center p-2.5 shadow-lift transition-transform hover:!scale-110 ${FAN[i]}`}
            style={
              ev.poster_url
                ? { backgroundImage: `url(${ev.poster_url})` }
                : { backgroundImage: placeholderBg(ev.id) }
            }
          >
            <div
              className="absolute inset-0 rounded-[11px]"
              style={{
                background: "linear-gradient(transparent 45%, rgba(0,0,0,0.72))",
              }}
              aria-hidden
            />
            <div className="relative">
              <div className="text-[11px] font-semibold leading-tight text-white">
                {ev.title}
              </div>
              <div className="mt-0.5 text-[9px] text-white/80">
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
