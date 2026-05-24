import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/** Section 10 — Final CTA band before the footer. */
export function FinalCta({ clubCount }: { clubCount: number }) {
  return (
    <section className="bg-beige px-6 py-14 text-center">
      <h2 className="text-3xl font-extrabold tracking-tight text-ink">
        Ready to find your club?
      </h2>
      <p className="mb-6 mt-2 text-sm text-ink-soft">
        {clubCount} clubs. One of them is yours.
      </p>
      <Button href="/clubs">
        Browse clubs <Icon name="arrow" size={16} />
      </Button>
    </section>
  );
}
