import { placeholderBg } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

/**
 * Section 7 — Gallery marquee. Two rows auto-scrolling opposite directions
 * (pure CSS via tailwind keyframes), pausing on hover. Track is duplicated so
 * the -50% loop is seamless.
 */
function Row({
  images,
  reverse,
  seedPrefix,
}: {
  images: string[];
  reverse?: boolean;
  seedPrefix: string;
}) {
  // 8 tiles, doubled for seamless loop
  const base = Array.from({ length: 8 }, (_, i) => images[i] ?? null);
  const doubled = [...base, ...base];

  return (
    <div className="group overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <div
        className={`flex w-max gap-2.5 ${
          reverse ? "animate-marquee-right" : "animate-marquee-left"
        } group-hover:[animation-play-state:paused]`}
      >
        {doubled.map((url, i) => (
          <div
            key={i}
            className="h-[100px] w-[152px] flex-shrink-0 rounded-[10px] bg-cover bg-center"
            style={
              url
                ? { backgroundImage: `url(${url})` }
                : { backgroundImage: placeholderBg(`${seedPrefix}-${i % 8}`) }
            }
          />
        ))}
      </div>
    </div>
  );
}

export function GalleryMarquee({ images = [] }: { images?: string[] }) {
  return (
    <section className="bg-beige px-6 py-12">
      <div className="mb-6 text-center font-display text-4xl font-extrabold tracking-[0.3em] text-ink">
        MOMENTS
      </div>

      <div className="space-y-2.5">
        <Row images={images} seedPrefix="g-top" />
        <Row images={images.slice(4)} reverse seedPrefix="g-bot" />
      </div>

      <div className="mt-6 text-center">
        <Button href="/gallery" variant="dark" size="sm">
          View gallery →
        </Button>
      </div>
    </section>
  );
}
