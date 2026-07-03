"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconCircleCheck } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/supabase__client";

/**
 * Polls the current session while the user is stuck on the verify-email page.
 *
 * The tricky bit: when the user clicks the link in Tab B, the /auth/callback
 * route sets an HttpOnly session cookie. But this tab's browser Supabase
 * client reads its session into memory at init — it doesn't automatically
 * re-read cookies later. So plain getUser() polls return null forever.
 *
 * Three signals we watch:
 *   1. refreshSession() — force re-reads the cookie from disk
 *   2. visibilitychange + focus — fires the instant user returns to this tab
 *      after clicking the email link (dominant real-world path)
 *   3. onAuthStateChange — supabase-ssr fires SIGNED_IN across tabs when the
 *      cookie changes (works in some browsers, not all)
 *
 * Two separate effects: the polling effect owns the timers + listeners and
 * only runs once (no `verified` dep). A second effect handles the delayed
 * navigation. If they were combined, flipping `verified` would tear down the
 * whole effect mid-navigation and cancel the router.push. That was a real bug.
 */
export function VerifyEmailPoller() {
  const router = useRouter();
  const [verified, setVerified] = React.useState(false);
  const verifiedRef = React.useRef(false);

  // Polling + listeners. Runs once. Uses a ref to gate against double-fires.
  React.useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    function markVerified() {
      if (cancelled || verifiedRef.current) return;
      verifiedRef.current = true;
      setVerified(true);
    }

    async function check() {
      if (cancelled || verifiedRef.current) return;
      await supabase.auth.refreshSession();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) markVerified();
    }

    check();

    const interval = setInterval(check, 3000);

    const onFocus = () => check();
    const onVis = () => {
      if (document.visibilityState === "visible") check();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") markVerified();
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation. Fires when `verified` flips to true.
  React.useEffect(() => {
    if (!verified) return;
    const t = setTimeout(() => router.push("/profile/complete"), 1200);
    return () => clearTimeout(t);
  }, [verified, router]);

  if (verified) {
    return (
      <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-sport/30 bg-sport/5 px-3 py-2 text-xs text-sport">
        <IconCircleCheck size={14} /> Email verified — redirecting…
      </div>
    );
  }

  return (
    <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-ink-soft">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo" />
      Waiting for verification…
    </p>
  );
}
