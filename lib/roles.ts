/**
 * Role tag helpers — step 17B.
 * Structural roles are fixed enum; display labels can be customized per-drive
 * (snapshotted to member on publish).
 */

export const ROLE_ENUM = [
  "volunteer",
  "coordinator",
  "core_coordinator",
  "head_coordinator",
  "overall_coordinator",
] as const;

export type Role = (typeof ROLE_ENUM)[number];

export const ROLE_DEFAULT_LABELS: Record<Role, string> = {
  volunteer: "Volunteer",
  coordinator: "Coordinator",
  core_coordinator: "Core Coordinator",
  head_coordinator: "Head Coordinator",
  overall_coordinator: "Overall Coordinator",
};

/** Year advisory mapping — used ONLY for soft warnings at drive creation. */
export const ROLE_ADVISORY_YEAR: Record<Role, number> = {
  volunteer: 1,
  coordinator: 2,
  core_coordinator: 3,
  head_coordinator: 4,
  overall_coordinator: 4,
};

/** Promotion tier map — next role up. `overall_coordinator` has no promotion. */
export const ROLE_PROMOTION_NEXT: Record<Role, Role | null> = {
  volunteer: "coordinator",
  coordinator: "core_coordinator",
  core_coordinator: "head_coordinator",
  head_coordinator: "overall_coordinator",
  overall_coordinator: null,
};

/**
 * Return the display label for a role, falling back to the default if
 * no custom label is set.
 */
export function displayRoleLabel(role: Role, customLabel?: string | null): string {
  if (customLabel && customLabel.trim().length > 0) return customLabel;
  return ROLE_DEFAULT_LABELS[role];
}

/**
 * Check if a role's advisory year is in the drive's target_years array.
 * Returns null if matched, or a warning message string if mismatched.
 * NEVER blocking — this is UI advisory only.
 */
export function roleYearAdvisory(
  role: Role,
  targetYears: number[],
): string | null {
  const advisoryYear = ROLE_ADVISORY_YEAR[role];
  if (targetYears.includes(advisoryYear)) return null;
  return `${ROLE_DEFAULT_LABELS[role]} typically goes to Year ${advisoryYear} students. This drive targets Year ${targetYears.join(", ")}. Continue if intentional.`;
}
