"use client";

import * as React from "react";
import { IconDownload } from "@tabler/icons-react";

/** Download CSV button with a small "Anonymize PII" checkbox.
 *  Renders as an <a> with download attribute so the browser handles the
 *  file save natively. */
export function ExportCsvButton({
  href,
  label = "Export CSV",
  compact = false,
}: {
  href: string; // base URL without ?anonymize
  label?: string;
  compact?: boolean;
}) {
  const [anonymize, setAnonymize] = React.useState(false);
  const url = `${href}${href.includes("?") ? "&" : "?"}${anonymize ? "anonymize=1" : ""}`;

  return (
    <div
      className={
        compact
          ? "inline-flex items-center gap-2"
          : "flex flex-wrap items-center gap-3"
      }
    >
      <a
        href={url}
        download
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs text-ink hover:border-ink/30"
      >
        <IconDownload size={13} /> {label}
      </a>
      <label className="flex items-center gap-1.5 text-[11px] text-ink-soft">
        <input
          type="checkbox"
          checked={anonymize}
          onChange={(e) => setAnonymize(e.target.checked)}
          className="h-3 w-3 rounded border-line accent-indigo"
        />
        Anonymize PII
      </label>
    </div>
  );
}
