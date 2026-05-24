export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-medium text-clay">National Institute of Technology · Raipur</p>
      <h1 className="font-display text-6xl font-extrabold tracking-tightest text-ink">
        NITRR Clubs<span className="text-indigo">.</span>
      </h1>
      <p className="max-w-sm text-ink-soft">
        Scaffold is live. Fonts, design tokens, and Tailwind are wired up. The
        real homepage gets built at step 4.
      </p>
      <span className="mt-4 rounded-full bg-indigo px-5 py-2 text-sm font-medium text-indigo-fg shadow-glow">
        Step 1 complete
      </span>
    </main>
  );
}