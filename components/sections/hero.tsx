import { Button } from "@/components/ui/button";
import { Icon, placeholderBg } from "@/components/ui/icon";
import { siteConfig } from "@/lib/site-config";

/**
 * Section 2 — Hero. Photo mosaic behind a cream radial veil + wordmark.
 * `images` are real gallery URLs; falls back to gradient tiles.
 */
export function Hero({ images = [] }: { images?: string[] }) {
  // 24 tiles; use real images where available, gradients otherwise
  const tiles = Array.from({ length: 24 }, (_, i) => images[i] ?? null);

  return (
    <section className="relative overflow-hidden px-6 pb-10 pt-24">
      <div className="absolute inset-0 grid grid-cols-6 gap-1" aria-hidden>
        {tiles.map((url, i) => (
          <div
            key={i}
            className="rounded-[3px] bg-cover bg-center"
            style={
              url
                ? { backgroundImage: `url(${url})` }
                : { backgroundImage: placeholderBg(`hero-${i}`) }
            }
          />
        ))}
      </div>

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(247,243,236,0.78) 0%, rgba(247,243,236,0.94) 70%)",
        }}
        aria-hidden
      />

      <div className="relative pt-4 text-center">
        <p className="mb-2 text-xs font-medium text-ink-soft">
          {siteConfig.kicker}
        </p>
        <p className="font-display text-2xl font-medium text-ink">Welcome to</p>
        <h1 className="my-1 font-display text-5xl font-extrabold tracking-tightest text-ink sm:text-6xl">
          NITRR Clubs<span className="text-indigo">.</span>
        </h1>
        <p className="mb-6 text-[13px] tracking-[0.4em] text-ink-soft">raipur</p>
        <Button href="/clubs">
          Browse clubs <Icon name="arrow" size={16} />
        </Button>
      </div>
    </section>
  );
}
