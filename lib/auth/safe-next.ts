/**
 * safeNextPath — hardened redirect target validator.
 *
 * Rejects:
 *  - null / undefined / non-string values
 *  - protocol-relative URLs (`//evil.com` — starts with `/` but hijacks host)
 *  - backslash-flip protocol-relative (`/\\evil.com` — some browsers interpret)
 *  - URLs with schemes (`http://`, `javascript:`, `data:`, etc.)
 *  - Anything not starting with a single `/`
 *
 * Returns `/` as safe fallback for any rejected input.
 *
 * Used by all auth flows that consume a `?next=` parameter:
 *  - lib/actions/auth.ts (signInWithPassword, signInWithGoogle, signUp)
 *  - lib/actions/profile.ts (completeProfile)
 *  - app/auth/callback/route.ts (OAuth callback)
 *
 * Kept in lib/auth/ alongside lib/auth/policy.ts (email allowlist from 15e).
 */
export function safeNextPath(next: string | null | undefined): string {
  // Type + presence check
  if (!next || typeof next !== "string") return "/";

  // Protocol-relative bypass: `//evil.com` starts with `/` but browsers
  // treat it as an absolute URL with the current scheme.
  if (next.startsWith("//")) return "/";

  // Backslash-flip bypass: some legacy browsers normalize `/\\` to `//`
  if (next.startsWith("/\\")) return "/";

  // Scheme-based URLs: `http://`, `https://`, `javascript:`, `data:`, etc.
  if (/^[a-z][a-z0-9+.-]*:/i.test(next)) return "/";

  // Must be a same-origin absolute path
  if (!next.startsWith("/")) return "/";

  return next;
}
