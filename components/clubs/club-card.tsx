import Link from "next/link";
import { placeholderBg } from "@/components/ui/icon";
import type { ClubWithCategory } from "@/lib/queries/clubs";

/**
 * Club card for the /clubs listing grid. Same fade-frost hover as the landing
 * cards: photo front, frosted highlights overlay on hover/focus.
 */
export function ClubCard({ club }: { club: ClubWithCategory }) {
  const color = club.category?.color ?? "#5B52E0";
  const cover = club.cover_url ?? club.logo_url;

  return (
    <Link
      href={`/clubs/${club.slug}`}
      tabIndex={0}
      className="group relative aspect-[255/215.66] w-full overflow-hidden rounded-2xl bg-cover bg-center"
      style={
        cover
          ? { backgroundImage: `url(${cover})` }
          : { backgroundImage: placeholderBg(club.id) }
      }
    >
      <span
        className="absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-medium text-white"
        style={{ backgroundColor: color }}
      >
        {club.category?.name ?? "Club"}
      </span>
      <div
        className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-0 group-focus:opacity-0"
        style={{ background: "linear-gradient(transparent 45%, rgba(0,0,0,0.82))" }}
        aria-hidden
      />
      <div className="absolute bottom-3.5 left-3.5 z-10 transition-opacity duration-300 group-hover:opacity-0 group-focus:opacity-0">
        <h3 className="text-[15px] font-medium text-white">{club.name}</h3>
        {club.tagline && (
          <p className="text-[11px] text-white/80">{club.tagline}</p>
        )}
      </div>

      <div className="absolute inset-0 flex flex-col bg-ink/70 p-4 opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100 group-focus:opacity-100">
        <h4 className="mb-2 text-sm font-semibold text-white">{club.name}</h4>
        <ul className="flex-1 space-y-1.5">
          {(club.highlights ?? []).slice(0, 4).map((h, i) => (
            <li
              key={i}
              className="relative pl-3.5 text-[11px] leading-snug text-[#EAE7DF] before:absolute before:left-0 before:top-[6px] before:h-[5px] before:w-[5px] before:rounded-full before:bg-clay before:content-['']"
            >
              {h}
            </li>
          ))}
        </ul>
        <span className="text-[11px] font-medium text-white/90">View club →</span>
      </div>
    </Link>
  );
}
