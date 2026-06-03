export type Phase = "open" | "review" | "result";

export interface PhaseInputs {
  recruitment_deadline: string | null;
  result_date?: string | null;
  results_published_at?: string | null;
}

/**
 * Compute the current phase from a club's three relevant dates.
 * Mirrors the SQL club_phase() function so client + server agree.
 */
export function getPhase(c: PhaseInputs, now: Date = new Date()): Phase {
  if (c.results_published_at) return "result";
  if (!c.recruitment_deadline) return "open";
  if (now < new Date(c.recruitment_deadline)) return "open";
  return "review";
}

export function phaseLabel(p: Phase): string {
  switch (p) {
    case "open":
      return "Open";
    case "review":
      return "Under review";
    case "result":
      return "Results published";
  }
}

export function studentMessage(
  p: Phase,
  c: PhaseInputs,
  now: Date = new Date(),
): string {
  if (p === "open") return "You can edit or withdraw until the deadline.";
  if (p === "result") return "Results are published.";

  if (c.result_date && now > new Date(c.result_date)) {
    return "Your application is under review. Results were expected by this date — please contact the club lead if it's been a while.";
  }
  return "Your application is locked while the club reviews.";
}

export const PHASE_BADGE: Record<Phase, string> = {
  open: "bg-sport-soft text-sport",
  review: "bg-indigo-soft text-indigo",
  result: "bg-beige text-ink-soft",
};
