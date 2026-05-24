/**
 * Placeholder home — confirms the shared shell (nav + footer) renders.
 * Replaced by the real 10-section landing at step 4.
 */
export default function HomePage() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 pt-28 text-center">
      <p className="text-sm font-medium text-clay">
        National Institute of Technology · Raipur
      </p>
      <h1 className="font-display text-5xl font-extrabold tracking-tightest text-ink sm:text-6xl">
        NITRR Clubs<span className="text-indigo">.</span>
      </h1>
      <p className="max-w-md text-ink-soft">
        Shared shell is live — frosted nav pills above, dark footer below. The
        real 10-section homepage gets built next at step 4.
      </p>
    </section>
  );
}
