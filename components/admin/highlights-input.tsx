"use client";

import * as React from "react";
import { IconX } from "@tabler/icons-react";

/**
 * Chip-style input for the club's highlight bullets. Renders one hidden
 * `highlights__N` form field per chip, so the server action can collect them.
 * Click X to remove, type + Enter or "Add" to append.
 */
export function HighlightsInput({ initial }: { initial: string[] }) {
  const [items, setItems] = React.useState<string[]>(initial ?? []);
  const [draft, setDraft] = React.useState("");

  function add() {
    const v = draft.trim();
    if (!v) return;
    setItems((prev) => (prev.length >= 8 ? prev : [...prev, v]));
    setDraft("");
  }

  function remove(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      {/* hidden fields the action reads */}
      {items.map((h, i) => (
        <input key={i} type="hidden" name={`highlights__${i}`} value={h} />
      ))}

      <div className="mb-2 flex flex-wrap gap-2">
        {items.map((h, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-xs text-ink"
          >
            {h}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove ${h}`}
              className="-mr-1 rounded-full p-0.5 hover:bg-ink/10"
            >
              <IconX size={12} />
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-ink-soft">No highlights yet.</span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. National Robocon team"
          maxLength={80}
          disabled={items.length >= 8}
          className="flex-1 rounded-xl border border-line bg-white p-2.5 text-sm text-ink outline-none focus:border-indigo disabled:opacity-60"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || items.length >= 8}
          className="rounded-full bg-ink px-4 py-2.5 text-xs font-medium text-cream hover:bg-ink/90 disabled:opacity-60"
        >
          Add
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-ink-soft">
        Up to 8 bullets. These appear on the club&apos;s flip card and detail page.
      </p>
    </div>
  );
}
