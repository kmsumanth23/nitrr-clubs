export type Phase = "open" | "review" | "result";

/**
 * Inputs match the `recruitments` table's relevant fields (renamed from
 * the old clubs-based shape). A `null` recruitment passed to getPhase means
 * "club has no current recruitment" — return null phase, callers can show
 * "Not currently recruiting" UI.
 */
export interface PhaseInputs {
  deadline: string | null;
  result_date?: string | null;
  results_published_at?: string | null;
}

export function getPhase(r: PhaseInputs | null, now: Date = new Date()): Phase | null {
  if (!r) return null; // no recruitment exists
  if (r.results_published_at) return "result";
  if (!r.deadline) return "open"; // no deadline = indefinitely open
  if (now < new Date(r.deadline)) return "open";
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
  r: PhaseInputs,
  now: Date = new Date(),
): string {
  if (p === "open") return "You can edit or withdraw until the deadline.";
  if (p === "result") return "Results are published.";
  if (r.result_date && now > new Date(r.result_date)) {
    return "Your application is under review. Results were expected by this date — please contact the club lead if it's been a while.";
  }
  return "Your application is locked while the club reviews.";
}

export const PHASE_BADGE: Record<Phase, string> = {
  open: "bg-sport-soft text-sport",
  review: "bg-indigo-soft text-indigo",
  result: "bg-beige text-ink-soft",
};
