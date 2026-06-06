import Link from "next/link";
import {
  IconPencil,
  IconCalendarEvent,
  IconFileText,
  IconPhoto,
} from "@tabler/icons-react";
import { getMyAdminClubs } from "@/lib/queries/admin";
import { deadlineLabel } from "@/lib/deadline";
import type { AdminTier } from "@/lib/database.types";

export const metadata = { title: "Admin — NITRR Clubs" };

const TIER_STYLES: Record<AdminTier, string> = {
  lead: "bg-indigo text-indigo-fg",
  manager: "bg-indigo-soft text-indigo",
  editor: "bg-beige text-ink-soft",
};

export default async function AdminPage() {
  const clubs = await getMyAdminClubs();

  return (
    <section>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">
        Admin dashboard
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Pick a club to manage. Use the chips on each card to jump straight to a
        section.
      </p>

      <h2 className="mb-3 mt-10 text-lg font-bold text-ink">
        Clubs you manage
      </h2>

      {clubs.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
          You aren&apos;t assigned to any club yet. A super-admin can add you in
          the club_admins table.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {clubs.map((c) => {
            const base = `/admin/clubs/${c.slug}`;
            const showApps = c.tier !== "editor";
            return (
              <li
                key={c.id}
                className="rounded-2xl border border-line bg-white p-5"
              >
                <Link href={base} className="block">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink hover:text-indigo">
                        {c.name}
                      </div>
                      {c.category && (
                        <div className="mt-0.5 text-xs text-ink-soft">
                          {c.category.name}
                        </div>
                      )}
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium capitalize ${TIER_STYLES[c.tier]}`}
                    >
                      {c.tier}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                    <span>{c.member_count ?? 0} members</span>
                    <span>{c.upcoming_events} upcoming events</span>
                    {c.pending_applications !== null && (
                      <span>
                        {c.pending_applications} pending application
                        {c.pending_applications === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-[11px] text-ink-soft">
                    {deadlineLabel(c.current_recruitment?.deadline ?? null)} ·{" "}
                    {c.is_recruiting ? "Recruiting" : "Not recruiting"}
                  </div>
                </Link>

                {/* action chips */}
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
                  <Chip href={base} icon={IconPencil} label="Edit" />
                  <Chip
                    href={`${base}/events`}
                    icon={IconCalendarEvent}
                    label="Events"
                  />
                  {showApps && (
                    <Chip
                      href={`${base}/applications`}
                      icon={IconFileText}
                      label="Applications"
                    />
                  )}
                  <Chip
                    href={`${base}/gallery`}
                    icon={IconPhoto}
                    label="Gallery"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Chip({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-3 py-1 text-[11px] font-medium text-ink-soft hover:border-ink/30 hover:text-ink"
    >
      <Icon size={12} />
      {label}
    </Link>
  );
}
