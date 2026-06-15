"use client";

import * as React from "react";
import { IconSearch, IconUser } from "@tabler/icons-react";
import {
  searchProfiles,
  type ProfileSearchResult,
} from "@/lib/queries/profile-search";

/** Debounced typeahead that searches profiles by name/email/roll.
 *  Used inside the add-admin modal. Selecting a result calls onSelect with
 *  the profile; clearing the input clears the selection. */
export function ProfileSearch({
  excludeClubId,
  selected,
  onSelect,
}: {
  excludeClubId?: string;
  selected: ProfileSearchResult | null;
  onSelect: (profile: ProfileSearchResult | null) => void;
}) {
  const [input, setInput] = React.useState("");
  const [results, setResults] = React.useState<ProfileSearchResult[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  React.useEffect(() => {
    if (selected) return; // don't search while one is locked in
    const q = input.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const list = await searchProfiles(q, excludeClubId);
      setResults(list);
      setLoading(false);
    }, 250);
    return () => {
      clearTimeout(t);
      setLoading(false);
    };
  }, [input, selected, excludeClubId]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-cream p-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">
            {selected.full_name ?? "—"}
          </div>
          <div className="mt-0.5 text-xs text-ink-soft">
            {selected.email}
            {selected.roll_number && <> · {selected.roll_number}</>}
            {selected.year && <> · Year {selected.year}</>}
            {selected.branch && <> · {selected.branch}</>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setInput("");
          }}
          className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-ink-soft hover:border-ink/30 hover:text-ink"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-2.5">
        <IconSearch size={14} className="text-ink-soft" />
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search by name, email, or roll number…"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
        />
      </div>

      {open && (loading || results.length > 0 || input.trim().length >= 2) && (
        <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-soft">
          {loading && (
            <p className="px-3 py-2 text-xs text-ink-soft">Searching…</p>
          )}
          {!loading && results.length === 0 && input.trim().length >= 2 && (
            <p className="px-3 py-2 text-xs text-ink-soft">
              No matches. Try a different name or roll number.
            </p>
          )}
          {!loading &&
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-cream"
              >
                <IconUser
                  size={14}
                  className="mt-0.5 flex-shrink-0 text-ink-soft"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm text-ink">
                    {p.full_name ?? "—"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-soft">
                    {p.email}
                    {p.roll_number && <> · {p.roll_number}</>}
                    {p.year && <> · Year {p.year}</>}
                    {p.branch && <> · {p.branch}</>}
                  </div>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
