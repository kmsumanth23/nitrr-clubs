import type { ReactNode } from "react";
import type { AuditEntry } from "@/lib/queries/audit";

/** Format an audit entry as a human-readable sentence. Per-action shape so
 *  the prose reads naturally instead of as a JSON dump. Returns React nodes
 *  so club names can be linked. */
export function formatAuditEntry(entry: AuditEntry): {
  label: string;
  sentence: ReactNode;
} {
  const actor = entry.actor?.full_name ?? "Someone";
  const target = entry.target_profile?.full_name ?? null;
  const clubName = entry.target_club?.name ?? null;
  const details = entry.details ?? {};

  switch (entry.action) {
    case "add_club_admin": {
      const tier = (details.tier as string) ?? "admin";
      return {
        label: "Admin added",
        sentence: (
          <>
            <strong>{actor}</strong> added{" "}
            <strong>{target ?? "someone"}</strong> as {tier}
          </>
        ),
      };
    }

    case "remove_club_admin": {
      const tier = (details.tier as string) ?? "admin";
      return {
        label: "Admin removed",
        sentence: (
          <>
            <strong>{actor}</strong> removed <strong>{target ?? "an admin"}</strong>{" "}
            (was {tier})
          </>
        ),
      };
    }

    case "change_club_admin_tier": {
      const from = (details.from as string) ?? "?";
      const to = (details.to as string) ?? "?";
      return {
        label: "Tier changed",
        sentence: (
          <>
            <strong>{actor}</strong> changed <strong>{target ?? "an admin"}</strong>{" "}
            from {from} to {to}
          </>
        ),
      };
    }

    case "create_club": {
      const slug = (details.slug as string) ?? "";
      const name = (details.name as string) ?? clubName ?? "a club";
      return {
        label: "Club created",
        sentence: (
          <>
            <strong>{actor}</strong> created <strong>{name}</strong>
            {slug && <> (/{slug})</>}
            {target && <>, lead: <strong>{target}</strong></>}
          </>
        ),
      };
    }

    case "decommission_club":
      return {
        label: "Club decommissioned",
        sentence: (
          <>
            <strong>{actor}</strong> decommissioned this club
          </>
        ),
      };

    case "restore_club":
      return {
        label: "Club restored",
        sentence: (
          <>
            <strong>{actor}</strong> restored this club
          </>
        ),
      };

    case "permanent_delete_club": {
      const slug = (details.club_slug as string) ?? "";
      const name = (details.club_name as string) ?? "a club";
      return {
        label: "Club deleted",
        sentence: (
          <>
            <strong>{actor}</strong> permanently deleted{" "}
            <strong>{name}</strong>
            {slug && <> (/{slug})</>}
          </>
        ),
      };
    }

    case "set_super_admin": {
      const value = !!details.value;
      return {
        label: value ? "Sysadmin promoted" : "Sysadmin demoted",
        sentence: (
          <>
            <strong>{actor}</strong> {value ? "promoted" : "demoted"}{" "}
            <strong>{target ?? "someone"}</strong>{" "}
            {value ? "to sysadmin" : "from sysadmin"}
          </>
        ),
      };
    }

    case "publish_results": {
      const added = (details.members_added as number) ?? 0;
      const recName = (details.recruitment_name as string) ?? "a recruitment";
      return {
        label: "Members added",
        sentence: (
          <>
            <strong>{actor}</strong> published <em>{recName}</em>, {added}{" "}
            new member{added === 1 ? "" : "s"} added
          </>
        ),
      };
    }

    case "remove_member":
      return {
        label: "Member removed",
        sentence: (
          <>
            <strong>{actor}</strong> removed{" "}
            <strong>{target ?? "a member"}</strong>
          </>
        ),
      };

    case "create_drive": {
      const name = (details.name as string) ?? "a drive";
      const targetYears = details.target_years as number[] | undefined;
      const yearsLabel =
        targetYears && targetYears.length > 0
          ? ` for Year ${targetYears.join(", ")}`
          : "";
      return {
        label: "Drive created",
        sentence: (
          <>
            <strong>{actor}</strong> created drive{" "}
            <strong>{name}</strong>
            {yearsLabel}
          </>
        ),
      };
    }

    case "publish_drive": {
      const qCount = (details.question_count as number) ?? 0;
      return {
        label: "Drive published",
        sentence: (
          <>
            <strong>{actor}</strong> published a drive ({qCount} question
            {qCount === 1 ? "" : "s"})
          </>
        ),
      };
    }

    case "delete_drive": {
      const phase = (details.phase_at_deletion as string) ?? "unknown";
      return {
        label: "Drive deleted",
        sentence: (
          <>
            <strong>{actor}</strong> deleted a drive (was in {phase})
          </>
        ),
      };
    }

    default:
      return {
        label: entry.action,
        sentence: (
          <>
            <strong>{actor}</strong> performed action: {entry.action}
          </>
        ),
      };
  }
}
