"use client";

import * as React from "react";

/**
 * Warn the user when leaving a page with unsaved changes.
 *
 * Two exits are guarded:
 *  - reload / tab-close   → native browser prompt via `beforeunload`
 *  - in-app link click    → JS confirm() before letting the click through
 *
 * Browser back button is NOT intercepted — the standard popstate-pushState
 * hack works but leaves duplicate history entries and other rough edges, and
 * the two exits above catch the vast majority of accidental leaves.
 *
 * Usage:
 *   const dirty = ...;
 *   useUnsavedChanges(dirty);
 */
export function useUnsavedChanges(dirty: boolean) {
  // Reload / tab-close
  React.useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // In-app link clicks
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!dirty) return;
      const target = (e.target as HTMLElement | null)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || target.target === "_blank") return;
      const ok = window.confirm(
        "You have unsaved changes. Leave without saving?",
      );
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);
}
