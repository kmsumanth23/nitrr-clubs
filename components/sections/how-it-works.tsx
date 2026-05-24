import { Icon } from "@/components/ui/icon";

/**
 * Section 5 — How it works. Static 3-step guide for newcomers.
 * (Later, step 6: shown inline to logged-out users; logged-in users reach it
 * from the navbar. For now it always renders.)
 */
const STEPS = [
  {
    n: "01",
    icon: "ti-compass",
    color: "#5B52E0",
    bg: "#E5E2FB",
    title: "Discover",
    body: "Browse clubs by category that match your interests.",
  },
  {
    n: "02",
    icon: "ti-eye",
    color: "#C26A4A",
    bg: "#F6E2D6",
    title: "Explore",
    body: "See what a club does, its events and its team.",
  },
  {
    n: "03",
    icon: "ti-send",
    color: "#5C8A3A",
    bg: "#DFEBD6",
    title: "Apply",
    body: "Found your fit? Apply right from the club page.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-beige px-6 py-12">
      <div className="mb-7 text-center">
        <h2 className="text-[27px] font-extrabold tracking-tight text-ink">
          New here? Start in 3 steps
        </h2>
        <p className="mt-1.5 text-[13px] text-ink-soft">
          From browsing to belonging — here&apos;s how you join the action
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="relative rounded-2xl border border-line bg-white p-6 text-center"
          >
            <span className="absolute right-3.5 top-3 text-xs font-medium text-[#C4BCAD]">
              {s.n}
            </span>
            <div
              className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: s.bg }}
            >
              <Icon name={s.icon} size={20} style={{ color: s.color }} />
            </div>
            <h4 className="mb-1 text-sm font-medium text-ink">{s.title}</h4>
            <p className="text-[11px] leading-relaxed text-ink-soft">
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
