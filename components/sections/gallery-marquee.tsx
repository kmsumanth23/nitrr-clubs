import { placeholderBg } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

/**
 * Section — Gallery "MOMENTS". FULL SCREEN.
 * THREE film-strip marquees scrolling left / right / left, styled as proper
 * dark celluloid: a solid black film body with a row of sprocket holes INSET
 * within the top & bottom black borders (holes don't reach the photo or the
 * outer edge — so it frames like real film, not a chainsaw).
 *
 * Marquee = duplicated track animated to -50% for a seamless loop; pauses on hover.
 */

const CELLULOID = "#141414";
const HOLE = "#F0EAE0"; // matches beige section bg so holes read as punch-outs

/** One sprocket band: solid black with a centered, inset row of holes. */
function Sprockets() {
  return (
    <div
      className="flex h-3.5 w-full items-center sm:h-4"
      style={{ backgroundColor: CELLULOID }}
      aria-hidden
    >
      <div
        className="mx-auto h-1.5 w-full sm:h-2"
        style={{
          // holes are rounded rects inset from top/bottom of the black band
          backgroundImage: `repeating-linear-gradient(to right, transparent 0px, transparent 6px, ${HOLE} 6px, ${HOLE} 15px, transparent 15px, transparent 21px)`,
        }}
      />
    </div>
  );
}

function FilmStrip({
  images,
  reverse,
  seedPrefix,
}: {
  images: string[];
  reverse?: boolean;
  seedPrefix: string;
}) {
  const base = Array.from({ length: 8 }, (_, i) => images[i] ?? null);
  const doubled = [...base, ...base];

  return (
    <div className="group overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
      <div
        className={`w-max ${
          reverse ? "animate-marquee-right" : "animate-marquee-left"
        } group-hover:[animation-play-state:paused]`}
        style={{ backgroundColor: CELLULOID }}
      >
        <Sprockets />

        {/* frames — solid black gutters between/around them */}
        <div
          className="flex w-max items-center gap-2 px-2 py-1.5 sm:gap-2.5"
          style={{ backgroundColor: CELLULOID }}
        >
          {doubled.map((url, i) => (
            <div
              key={i}
              className="h-[72px] w-[108px] flex-shrink-0 rounded-[2px] bg-cover bg-center sm:h-[112px] sm:w-[168px]"
              style={
                url
                  ? { backgroundImage: `url(${url})` }
                  : { backgroundImage: placeholderBg(`${seedPrefix}-${i % 8}`) }
              }
            />
          ))}
        </div>

        <Sprockets />
      </div>
    </div>
  );
}

export function GalleryMarquee({ images = [] }: { images?: string[] }) {
  return (
    <section
      id="gallery"
      className="flex min-h-[100svh] scroll-mt-20 flex-col items-center justify-center bg-beige px-0 py-16"
    >
      <div className="mb-8 px-6 text-center font-display text-4xl font-extrabold tracking-[0.3em] text-ink sm:text-5xl">
        MOMENTS
      </div>

      <div className="w-full space-y-4 sm:space-y-6">
        <FilmStrip images={images} seedPrefix="g-1" />
        <FilmStrip images={images.slice(3)} reverse seedPrefix="g-2" />
        <FilmStrip images={images.slice(6)} seedPrefix="g-3" />
      </div>

      <div className="mt-10 px-6 text-center">
        <Button href="/gallery" variant="dark" size="sm">
          View gallery →
        </Button>
      </div>
    </section>
  );
}