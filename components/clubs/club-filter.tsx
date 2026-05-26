"use client";

import * as React from "react";
import { IconSearch } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { ClubCard } from "@/components/clubs/club-card";
import type { ClubWithCategory } from "@/lib/queries/clubs";
import type { Category } from "@/lib/database.types";

/**
 * Client island: category-pill filter + text search over an already-fetched
 * club list (no refetch — instant). Server fetches the data; this just filters
 * the array in memory. Ideal for ~18 clubs.
 */
export function ClubFilter({
  clubs,
  categories,
}: {
  clubs: ClubWithCategory[];
  categories: Category[];
}) {
  const [active, setActive] = React.useState<string>("all"); // category slug
  const [query, setQuery] = React.useState("");

  // count per category for the pill badges
  const counts = React.useMemo(() => {
    const map: Record<string, number> = { all: clubs.length };
    for (const c of clubs) {
      const slug = c.category?.slug ?? "uncategorized";
      map[slug] = (map[slug] ?? 0) + 1;
    }
    return map;
  }, [clubs]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return clubs.filter((c) => {
      const matchesCat = active === "all" || c.category?.slug === active;
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.tagline ?? "").toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q) ||
        (c.category?.name ?? "").toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [clubs, active, query]);

  return (
    <div>
      {/* search */}
      <div className="mx-auto mb-4 max-w-md">
        <div className="relative">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clubs..."
            className="w-full rounded-full border border-line bg-white py-2.5 pl-9 pr-4 text-sm text-ink outline-none focus:border-indigo"
          />
        </div>
      </div>

      {/* category pills */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        <Pill
          label="All"
          count={counts.all}
          active={active === "all"}
          onClick={() => setActive("all")}
        />
        {categories.map((cat) => (
          <Pill
            key={cat.id}
            label={cat.name}
            count={counts[cat.slug] ?? 0}
            active={active === cat.slug}
            onClick={() => setActive(cat.slug)}
          />
        ))}
      </div>

      {/* results */}
      <p className="mb-4 text-center text-xs text-ink-soft">
        {filtered.length} club{filtered.length !== 1 ? "s" : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-soft">
          No clubs match your filter. Try a different category or search term.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-ink text-cream"
          : "border-line bg-transparent text-ink-soft hover:border-ink/40",
      )}
    >
      {label}
      <span className="text-[10px] opacity-70">{count}</span>
    </button>
  );
}
