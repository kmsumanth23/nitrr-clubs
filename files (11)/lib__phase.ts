/**
 * Recruitment / drive phase types + computation.
 *
 * A drive's phase is DERIVED from its dates + publish state — never stored.
 * The order of checks matters: draft (unpublished) takes precedence over
 * everything, then result (published), then open/review from deadline.
 */

export type Phase = "draft" | "open" | "review" | "result";

/**
 * Inputs match the `recruitments` table's relevant fields.
 * `null` recruitment → return null phase (club has no drives).
 */
export interface PhaseInputs {
  deadline: string | null;
  result_date?: string | null;
  published_at?: string | null;      // 16A: null = draft
  results_published_at?: string | null;
}

export function getPhase(
  r: PhaseInputs | null,
  now: Date = new Date(),
): Phase | null {
  if (!r) return null;
  // 16A: draft check comes first — an unpublished drive is always draft
  // regardless of dates
  if (!r.published_at) return "draft";
  if (r.results_published_at) return "result";
  if (!r.deadline) return "open";
  if (now < new Date(r.deadline)) return "open";
  return "review";
}

export function phaseLabel(p: Phase): string {
  switch (p) {
    case "draft":
      return "Draft";
    case "open":
      return "Open";
    case "review":
      return "Under review";
    case "result":
      return "Results published";
  }
}

/**
 * Student-facing message for the phase. Draft shouldn't reach students
 * (draft drives filtered out of public views + trigger blocks apps),
 * but a defensive fallback exists.
 */
export function studentMessage(
  p: Phase,
  r: PhaseInputs,
  now: Date = new Date(),
): string {
  if (p === "draft") return "This drive isn't published yet.";
  if (p === "open") return "You can edit or withdraw until the deadline.";
  if (p === "result") return "Results are published.";
  if (r.result_date && now > new Date(r.result_date)) {
    return "Your application is under review. Results were expected by this date — please contact the club lead if it's been a while.";
  }
  return "Your application is locked while the club reviews.";
}

export const PHASE_BADGE: Record<Phase, string> = {
  draft: "bg-beige text-ink-soft",         // 16A: neutral, admin-only
  open: "bg-sport-soft text-sport",
  review: "bg-indigo-soft text-indigo",
  result: "bg-beige text-ink-soft",
};
