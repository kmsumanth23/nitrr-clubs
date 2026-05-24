import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { siteConfig } from "@/lib/site-config";

const ICON_COLOR: Record<string, string> = {
  instagram: "#C26A4A",
  linkedin: "#5B52E0",
  youtube: "#C26A4A",
};

/** Section 8 — Social handles. */
export function Socials() {
  return (
    <section className="px-6 pb-4 pt-12">
      <div className="mb-7 text-center">
        <h2 className="text-[27px] font-extrabold tracking-tight text-ink">
          Stay in the loop
        </h2>
        <p className="mt-1.5 text-[13px] text-ink-soft">
          Follow along for events, results and campus life
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {siteConfig.socials.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="flex items-center gap-2 rounded-full border border-line bg-white px-[18px] py-2.5 text-[13px] text-ink hover:bg-cream"
          >
            <Icon name={s.icon} size={17} style={{ color: ICON_COLOR[s.icon] }} />
            {s.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
