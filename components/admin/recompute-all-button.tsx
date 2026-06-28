"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconRefresh } from "@tabler/icons-react";
import { recomputeAll } from "@/lib/actions/recompute";

export function RecomputeAllButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setStatus(null);
    const result = await recomputeAll();
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error ?? "Failed");
    } else {
      const n = result.count ?? 0;
      setStatus(`${n} club${n === 1 ? "" : "s"} recomputed.`);
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full bg-indigo px-3.5 py-1.5 text-xs text-indigo-fg hover:bg-indigo/90 disabled:opacity-50"
      >
        <IconRefresh size={13} className={busy ? "animate-spin" : ""} />
        {busy ? "Recomputing..." : "Recompute all"}
      </button>
      {status && (
        <span className="text-[11px] text-ink-soft">{status}</span>
      )}
    </div>
  );
}
