import { redirect } from "next/navigation";
import Link from "next/link";
import {
  IconUserStar,
  IconPlus,
  IconArchive,
  IconHistory,
  IconDownload,
  IconArrowRight,
  IconQuestionMark,
  IconTags,
  IconDatabase,
  IconStethoscope,
  IconUpload,
} from "@tabler/icons-react";
import {
  isSysadmin,
  getSysadminCounts,
  getClubsWithoutAdmins,
  getRecruitmentsOverdue,
} from "@/lib/queries/sysadmin";
import { getAuditLog } from "@/lib/queries/audit";
import { SysadminAnomalies } from "@/components/admin/sysadmin-anomalies";
import { ActivityFeedWidget } from "@/components/admin/activity-feed-widget";

export const metadata = { title: "Sysadmin — Admin" };

export default async function SysadminPage() {
  if (!(await isSysadmin())) redirect("/admin");

  const [counts, clubsWithoutAdmins, recruitmentsOverdue, recentEntries] =
    await Promise.all([
      getSysadminCounts(),
      getClubsWithoutAdmins(),
      getRecruitmentsOverdue(),
      getAuditLog({ limit: 7 }),
    ]);

  const cards: {
    href: string;
    icon: typeof IconUserStar;
    label: string;
    desc: string;
  }[] = [
    {
      href: "/admin/sysadmin/super-admins",
      icon: IconUserStar,
      label: "Sysadmins",
      desc: "Promote or demote system-wide admins.",
    },
    {
      href: "/admin/sysadmin/create-club",
      icon: IconPlus,
      label: "Create club",
      desc: "Add a new club and assign its first lead.",
    },
    {
      href: "/admin/sysadmin/bulk-import",
      icon: IconUpload,
      label: "Bulk import",
      desc: "Upload a CSV to create many clubs at once.",
    },
    {
      href: "/admin/sysadmin/archived",
      icon: IconArchive,
      label: "Archived clubs",
      desc: "Restore decommissioned clubs.",
    },
    {
      href: "/admin/sysadmin/audit",
      icon: IconHistory,
      label: "Audit log",
      desc: "Every admin action across the system.",
    },
    {
      href: "/admin/sysadmin/export",
      icon: IconDownload,
      label: "Export",
      desc: "Download CSV files of members and admins.",
    },
    {
      href: "/admin/sysadmin/faqs",
      icon: IconQuestionMark,
      label: "FAQs",
      desc: "Manage the homepage and /faq accordion.",
    },
    {
      href: "/admin/sysadmin/categories",
      icon: IconTags,
      label: "Categories",
      desc: "Manage club category tags and ordering.",
    },
    {
      href: "/admin/sysadmin/storage",
      icon: IconDatabase,
      label: "Storage",
      desc: "Gallery photo usage per club; free tier meter.",
    },
    {
      href: "/admin/sysadmin/diagnostics",
      icon: IconStethoscope,
      label: "Diagnostics",
      desc: "Drift checks; recompute member counters.",
    },
  ];

  return (
    <section className="container mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Sysadmin
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          System-wide controls. Manage all clubs, admins, and content.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">
          At a glance
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Active clubs" value={counts.clubs_active} />
          <StatCard label="Archived" value={counts.clubs_archived} />
          <StatCard label="Members" value={counts.members} />
          <StatCard label="Events" value={counts.events} />
        </div>
      </section>

      <section className="mb-8">
        <ActivityFeedWidget entries={recentEntries} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">
          Anomalies
        </h2>
        <SysadminAnomalies
          clubsWithoutAdmins={clubsWithoutAdmins}
          recruitmentsOverdue={recruitmentsOverdue}
        />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">
          Tools
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="group flex items-start justify-between gap-3 rounded-2xl border border-line bg-white p-4 hover:border-indigo/40 hover:bg-cream"
            >
              <div className="flex items-start gap-3">
                <c.icon
                  size={20}
                  className="mt-0.5 text-ink-soft group-hover:text-indigo"
                />
                <div>
                  <div className="text-sm font-medium text-ink">{c.label}</div>
                  <div className="mt-0.5 text-xs text-ink-soft">{c.desc}</div>
                </div>
              </div>
              <IconArrowRight
                size={16}
                className="mt-0.5 text-ink-soft group-hover:text-indigo"
              />
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="text-2xl font-extrabold text-ink">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-soft">
        {label}
      </div>
    </div>
  );
}
