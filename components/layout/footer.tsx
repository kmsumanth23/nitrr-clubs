import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

/** The only dark section on the marketing pages. Server Component (static). */
export function Footer() {
  return (
    <footer className="bg-[#141414] px-6 pb-7 pt-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap justify-between gap-6">
          <p className="max-w-[200px] text-sm leading-relaxed text-[#C7C5BD]">
            <span className="font-medium text-white">
              NITRR isn&apos;t just a campus.
            </span>{" "}
            {siteConfig.tagline} 🎓
          </p>

          <div>
            <h5 className="mb-3 text-[11px] uppercase tracking-wide text-[#75736B]">
              Explore
            </h5>
            {siteConfig.nav
              .filter((n) => n.href !== "/")
              .map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="mb-1.5 block text-[13px] text-[#C7C5BD] hover:text-white"
                >
                  {n.label}
                </Link>
              ))}
          </div>

          <div>
            <h5 className="mb-3 text-[11px] uppercase tracking-wide text-[#75736B]">
              Socials
            </h5>
            {siteConfig.socials.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="mb-1.5 block text-[13px] text-[#C7C5BD] hover:text-white"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="text-center font-display text-5xl font-extrabold tracking-tightest text-white">
          NITRR<span className="text-indigo">.</span>
        </div>

        <div className="mt-4 flex justify-center gap-3.5 text-[11px] text-[#75736B]">
          {siteConfig.legal.map((l, i) => (
            <span key={l.label} className="flex gap-3.5">
              {i > 0 && <span aria-hidden>·</span>}
              <Link href={l.href} className="hover:text-[#C7C5BD]">
                {l.label}
              </Link>
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
