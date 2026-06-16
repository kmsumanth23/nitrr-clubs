import Link from "next/link";
import { IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";
import type {
  ClubAdminless,
  RecruitmentOverdue,
} from "@/lib/queries/sysadmin";

export function SysadminAnomalies({
  clubsWithoutAdmins,
  recruitmentsOverdue,
}: {
  clubsWithoutAdmins: ClubAdminless[];
  recruitmentsOverdue: RecruitmentOverdue[];
}) {
  const totalIssues =
    clubsWithoutAdmins.length + recruitmentsOverdue.length;

  if (totalIssues === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
        <IconCircleCheck size={20} className="text-sport" />
        <p className="text-sm text-ink-soft">
          No anomalies. Every active club has at least one admin, no
          recruitments are overdue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {clubsWithoutAdmins.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <IconAlertTriangle size={16} className="text-clay" />
            <h3 className="text-sm font-medium text-ink">
              Clubs without admins{" "}
              <span className="ml-1 rounded-full bg-clay-soft px-1.5 py-0.5 text-[10px] text-clay">
                {clubsWithoutAdmins.length}
              </span>
            </h3>
          </div>
          <ul className="space-y-1">
            {clubsWithoutAdmins.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-ink">{c.name}</span>
                <Link
                  href={`/admin/clubs/${c.slug}/admins`}
                  className="text-indigo hover:underline"
                >
                  Assign →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recruitmentsOverdue.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <IconAlertTriangle size={16} className="text-clay" />
            <h3 className="text-sm font-medium text-ink">
              Recruitments overdue{" "}
              <span className="ml-1 rounded-full bg-clay-soft px-1.5 py-0.5 text-[10px] text-clay">
                {recruitmentsOverdue.length}
              </span>
            </h3>
          </div>
          <ul className="space-y-1">
            {recruitmentsOverdue.map((r) => (
              <li
                key={r.recruitment_id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-ink">
                  {r.club_name}
                  {r.recruitment_name && (
                    <span className="text-ink-soft"> · {r.recruitment_name}</span>
                  )}{" "}
                  <span className="text-ink-soft">
                    ({r.days_overdue} day{r.days_overdue === 1 ? "" : "s"} overdue)
                  </span>
                </span>
                <Link
                  href={`/admin/clubs/${r.club_slug}/applications`}
                  className="text-indigo hover:underline"
                >
                  Review →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
