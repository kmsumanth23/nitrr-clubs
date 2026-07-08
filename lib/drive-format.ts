/**
 * Pure formatting helpers for drive data. Kept in a plain module (no
 * "use client" directive) so Server Components can call them directly.
 *
 * Originally lived in components/admin/target-years-picker.tsx, but that
 * file is a client component — importing pure helpers from a client
 * module makes Next.js treat them as client-only references, and calling
 * them from a Server Component throws at render time.
 */

/** Human-friendly label used in list rows, cards, etc. */
export function targetYearsLabel(years: number[]): string {
  if (!years || years.length === 0) return "No years";
  if (years.length === 4) return "All years";
  const sorted = [...years].sort((a, b) => a - b);
  return "Year " + sorted.join(", ");
}
