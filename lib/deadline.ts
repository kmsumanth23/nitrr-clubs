/** Deadline helpers — one cutoff governs apply / withdraw / edit. */

export function isOpen(deadline: string | null): boolean {
  if (!deadline) return true; // no deadline set = open
  return Date.now() < new Date(deadline).getTime();
}

export function deadlineLabel(deadline: string | null): string {
  if (!deadline) return "Open";
  const d = new Date(deadline);
  const closed = Date.now() > d.getTime();
  const date = d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return closed ? `Closed ${date}` : `Open until ${date}`;
}

export const CLOSED_MESSAGE =
  "Applications for this club are closed. You may contact the club lead for queries.";
