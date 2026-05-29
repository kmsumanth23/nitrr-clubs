import Link from "next/link";
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
        Manage the clubs you&apos;re responsible for. Tap a club to edit content.
      </p>

      <h2 className="mb-3 mt-10 text-lg font-bold text-ink" id="clubs">
        Clubs you manage
      </h2>

      {clubs.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
          You aren&apos;t assigned to any club yet. A super-admin can add you in
          the club_admins table.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {clubs.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/clubs/${c.slug}`}
                className="block rounded-2xl border border-line bg-white p-5 transition-colors hover:border-ink/30"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">
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
                  {deadlineLabel(c.recruitment_deadline)} ·{" "}
                  {c.is_recruiting ? "Recruiting" : "Not recruiting"}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Stub anchors so sidebar links don't 404 — replaced by real pages
          in 9c (events), 9d (applications), 9e (gallery). */}
      <h2 className="mb-3 mt-10 text-lg font-bold text-ink" id="events">
        Events
      </h2>
      <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
        Coming in 9c — create and edit events for your clubs.
      </p>

      <h2 className="mb-3 mt-10 text-lg font-bold text-ink" id="applications">
        Applications
      </h2>
      <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
        Coming in 9d — review applications, accept or reject. (Editors don&apos;t
        see this section.)
      </p>

      <h2 className="mb-3 mt-10 text-lg font-bold text-ink" id="gallery">
        Gallery
      </h2>
      <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
        Coming in 9e — upload and manage photos.
      </p>
    </section>
  );
}
