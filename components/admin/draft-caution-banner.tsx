"use client";

import * as React from "react";
import { IconAlertTriangle, IconX } from "@tabler/icons-react";

/**
 * Draft-phase caution banner for the drive editor.
 *
 * Reminds admins that structural changes (add/delete departments,
 * add/delete/reorder questions, choice cap) are locked after publish.
 * Renders only in draft phase, dismissible per-session via sessionStorage
 * (drive-scoped key so each drive prompts independently).
 *
 * 17C UX intent: encourage upfront thinking; guardrails ship in Batch 1.
 */
export function DraftCautionBanner({ driveId }: { driveId: string }) {
  const storageKey = `drive-caution-dismissed-v1:${driveId}`;
  const [dismissed, setDismissed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(storageKey) === "1") setDismissed(true);
    } catch {
      // sessionStorage unavailable — safe default: show banner
    }
  }, [storageKey]);

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // no-op; the useState above still hides it for this render
    }
  }

  if (!mounted) return null; // avoid hydration mismatch
  if (dismissed) return null;

  return (
    <div className="mb-4 rounded-2xl border border-clay/30 bg-clay/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <IconAlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-clay" />
          <div className="text-xs text-ink">
            <p className="mb-1 font-semibold">
              Draft is when you have full control.
            </p>
            <p className="text-ink-soft">
              Publishing progressively locks parts of the drive:
            </p>
            <ul className="mt-1 space-y-0.5 text-ink-soft">
              <li>
                <span className="font-medium text-ink">Publish</span> —
                departments and the choice cap freeze.
              </li>
              <li>
                <span className="font-medium text-ink">Deadline (Review)</span>{" "}
                — questions freeze (students have already answered).
              </li>
              <li>
                <span className="font-medium text-ink">Results published</span>{" "}
                — everything freezes except community links.
              </li>
            </ul>
            <p className="mt-1.5 text-ink-soft">
              Names, dates, description, role tag, and community links stay
              editable throughout. Take a moment to review your structure
              before publishing.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss caution"
          className="rounded-full p-1 text-ink-soft hover:bg-clay/10 hover:text-clay"
        >
          <IconX size={14} />
        </button>
      </div>
    </div>
  );
}
