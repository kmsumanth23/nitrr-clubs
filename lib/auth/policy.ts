/**
 * Email domain allowlist + Gmail canonicalization for NITRR Clubs auth.
 *
 * Pure module — no server-only APIs. Safe to import from client components.
 *
 * Enforcement points:
 *   - lib/actions/auth.ts signUp → isAllowedEmail + normalizeEmail (server, hard gate)
 *   - lib/actions/auth.ts signInWithPassword → normalizeEmail only (server)
 *   - lib/actions/auth.ts requestPasswordReset → normalizeEmail only (server;
 *     allowlist NOT enforced here — Supabase's anti-enumeration handles unknowns)
 *   - lib/actions/auth.ts resendVerification → normalizeEmail only (server)
 *   - components/layout/auth-modal.tsx → isAllowedEmail (client, hint only)
 */

/** Domains permitted for signup. Add/remove here and redeploy. */
export const ALLOWED_EMAIL_DOMAINS: readonly string[] = [
  "nitrr.ac.in",
  "gmail.com",
  "googlemail.com",   // Gmail alias — normalized to gmail.com
  "outlook.com",
  "yahoo.com",
  "protonmail.com",
  "icloud.com",
  "examplemail.com",  // 15e test-only, for welcometest@examplemail.com
];

/** Human-friendly summary for the client hint. Keep in sync with the list
 *  above; if we add many more domains, switch this to a shorter "...and more"
 *  formulation. */
export const ALLOWED_DOMAINS_HINT =
  "Use nitrr.ac.in, Gmail, Outlook, Yahoo, Protonmail, or iCloud.";

/** Canonicalize a Gmail local part.
 *  - Strips everything from `+` onward: `sumanth+work` → `sumanth`
 *  - Removes all dots: `s.u.manth` → `sumanth`
 *  Gmail treats these all as the same inbox. Other providers do NOT.
 */
function canonicalizeGmailLocal(local: string): string {
  const withoutTag = local.split("+")[0];
  return withoutTag.replace(/\./g, "");
}

/** Normalize an email:
 *  1. Trim whitespace
 *  2. Lowercase
 *  3. If domain is gmail.com or googlemail.com → canonicalize local part
 *     AND rewrite domain to gmail.com
 *  4. Otherwise return as-is (just trimmed + lowercased)
 *
 *  Malformed input (no `@`, empty parts) is returned as-is, trimmed and
 *  lowercased. Validation is the caller's responsibility.
 */
export function normalizeEmail(email: string): string {
  const cleaned = email.trim().toLowerCase();
  const at = cleaned.indexOf("@");
  if (at <= 0 || at === cleaned.length - 1) return cleaned;

  const local = cleaned.slice(0, at);
  const domain = cleaned.slice(at + 1);

  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${canonicalizeGmailLocal(local)}@gmail.com`;
  }

  return cleaned;
}

/** Check whether an email's domain is on the allowlist.
 *  Normalizes first, then compares the domain part.
 *  Returns false for malformed emails (no @).
 */
export function isAllowedEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  const at = normalized.indexOf("@");
  if (at <= 0) return false;
  const domain = normalized.slice(at + 1);
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

/** Get the domain part of an email (after normalization). Returns empty
 *  string for malformed input. Used by the client hint to check "does the
 *  user's typed domain match anything on the list?" */
export function getEmailDomain(email: string): string {
  const normalized = normalizeEmail(email);
  const at = normalized.indexOf("@");
  if (at <= 0) return "";
  return normalized.slice(at + 1);
}
