"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconRefresh } from "@tabler/icons-react";
import { recomputeOne } from "@/lib/actions/recompute";

export function RecomputeButton({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    const result = await recomputeOne(clubId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Failed");
    } else {
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-ink hover:border-indigo/30 hover:text-indigo disabled:opacity-50"
        aria-label="Recompute member count"
      >
        <IconRefresh size={11} className={busy ? "animate-spin" : ""} />
        {busy ? "..." : "Recompute"}
      </button>
      {error && <span className="ml-2 text-[10px] text-clay">{error}</span>}
    </>
  );
}
