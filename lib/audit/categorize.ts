/** Audit action → display category. Drives the filter pills. */

export type AuditCategory =
  | "all"
  | "club_admins"
  | "clubs"
  | "drives" // 16A
  | "super_admins"
  | "members";

export const CATEGORY_LABEL: Record<Exclude<AuditCategory, "all">, string> = {
  club_admins: "Club admins",
  clubs: "Clubs",
  drives: "Drives", // 16A
  super_admins: "Super admins",
  members: "Members",
};

const CLUB_ADMIN_ACTIONS = new Set([
  "add_club_admin",
  "remove_club_admin",
  "change_club_admin_tier",
]);
const CLUB_ACTIONS = new Set([
  "create_club",
  "decommission_club",
  "restore_club",
  "permanent_delete_club",
]);
const DRIVE_ACTIONS = new Set([
  "create_drive",
  "publish_drive",
  "delete_drive",
]);
const SUPER_ADMIN_ACTIONS = new Set(["set_super_admin"]);
const MEMBER_ACTIONS = new Set(["publish_results", "remove_member"]);

export function actionToCategory(action: string): AuditCategory {
  if (CLUB_ADMIN_ACTIONS.has(action)) return "club_admins";
  if (CLUB_ACTIONS.has(action)) return "clubs";
  if (DRIVE_ACTIONS.has(action)) return "drives";
  if (SUPER_ADMIN_ACTIONS.has(action)) return "super_admins";
  if (MEMBER_ACTIONS.has(action)) return "members";
  return "all"; // unknown actions surface in "All" only
}

/** SQL `IN (...)` list for a category. Used in queries to filter. */
export function actionsInCategory(category: AuditCategory): string[] {
  switch (category) {
    case "club_admins":
      return Array.from(CLUB_ADMIN_ACTIONS);
    case "clubs":
      return Array.from(CLUB_ACTIONS);
    case "drives":
      return Array.from(DRIVE_ACTIONS);
    case "super_admins":
      return Array.from(SUPER_ADMIN_ACTIONS);
    case "members":
      return Array.from(MEMBER_ACTIONS);
    case "all":
      return [];
  }
}
