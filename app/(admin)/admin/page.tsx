import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IconExternalLink,
  IconCalendarEvent,
  IconFileText,
  IconUsers,
  IconUserStar,
  IconPhoto,
  IconCircleDot,
  IconSettings,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/server";
import { getMyAdminClubs } from "@/lib/queries/admin";
import { isSysadmin } from "@/lib/queries/sysadmin";
import { DecommissionedBadge } from "@/components/ui/decommissioned-badge";

export const metadata = { title: "Admin — NITRR Clubs" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?signin=1");

  const [clubs, isSuper] = await Promise.all([
    getMyAdminClubs(),
    isSysadmin(),
  ]);

  return (
    <section className="container mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Admin dashboard
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Manage clubs you have access to.
        </p>
      </div>

      {clubs.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
          You don&apos;t have admin access to any club yet. If you should,
          contact a club lead or sysadmin.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((c) => {
            const isArchived = !!c.archived_at;
            // Sysadmin can manage archived clubs; non-sysadmin admins can't.
            const canManage = !isArchived || isSuper;

            return (
              <div
                key={c.id}
                className={
                  "flex flex-col rounded-2xl border bg-white p-4 " +
                  (isArchived ? "border-clay/30 bg-cream/40" : "border-line")
                }
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  {canManage ? (
                    <Link
                      href={`/admin/clubs/${c.slug}`}
                      className="flex-1 truncate text-sm font-semibold text-ink hover:text-indigo"
                    >
                      {c.name}
                    </Link>
                  ) : (
                    <span className="flex-1 truncate text-sm font-semibold text-ink-soft">
                      {c.name}
                    </span>
                  )}
                  <span className="rounded-full bg-beige px-1.5 py-0.5 text-[10px] capitalize text-ink-soft">
                    {c.tier}
                  </span>
                </div>

                <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-ink-soft">
                  {c.category?.name && (
                    <span className="rounded-full bg-cream px-2 py-0.5">
                      {c.category.name}
                    </span>
                  )}
                  {isArchived && (
                    <DecommissionedBadge archivedAt={c.archived_at} />
                  )}
                  {!isArchived && c.is_recruiting && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sport-soft px-2 py-0.5 text-sport">
                      <IconCircleDot size={9} /> Recruiting
                    </span>
                  )}
                </div>

                {canManage && (
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    <Chip
                      href={`/admin/clubs/${c.slug}`}
                      icon={IconSettings}
                      label="Edit"
                    />
                    <Chip
                      href={`/admin/clubs/${c.slug}/events`}
                      icon={IconCalendarEvent}
                      label="Events"
                      count={c.upcoming_events || undefined}
                    />
                    {c.tier !== "editor" && (
                      <>
                        <Chip
                          href={`/admin/clubs/${c.slug}/applications`}
                          icon={IconFileText}
                          label="Applications"
                          count={c.pending_applications ?? undefined}
                        />
                        <Chip
                          href={`/admin/clubs/${c.slug}/members`}
                          icon={IconUsers}
                          label="Members"
                        />
                      </>
                    )}
                    <Chip
                      href={`/admin/clubs/${c.slug}/admins`}
                      icon={IconUserStar}
                      label="Admins"
                    />
                    <Chip
                      href={`/admin/clubs/${c.slug}/gallery`}
                      icon={IconPhoto}
                      label="Gallery"
                    />
                    <Chip
                      href={`/clubs/${c.slug}`}
                      icon={IconExternalLink}
                      label="View"
                      external
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isSuper && (
        <section className="mt-10">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">
            System
          </h2>
          <Link
            href="/admin/sysadmin"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 hover:border-indigo/40 hover:bg-cream"
          >
            <div className="flex items-start gap-3">
              <IconUserStar
                size={20}
                className="mt-0.5 text-ink-soft group-hover:text-indigo"
              />
              <div>
                <div className="text-sm font-medium text-ink">Sysadmin dashboard</div>
                <div className="mt-0.5 text-xs text-ink-soft">
                  System-wide controls — create clubs, manage sysadmins,
                  archive, audit log.
                </div>
              </div>
            </div>
            <span className="text-xs text-indigo">Open →</span>
          </Link>
        </section>
      )}
    </section>
  );
}

function Chip({
  href,
  icon: Icon,
  label,
  count,
  external,
}: {
  href: string;
  icon: typeof IconCalendarEvent;
  label: string;
  count?: number;
  external?: boolean;
}) {
  const cls =
    "inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-ink-soft hover:border-ink/30 hover:text-ink";
  const content = (
    <>
      <Icon size={12} />
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1 rounded-full bg-indigo-soft px-1 text-indigo">
          {count}
        </span>
      )}
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {content}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}
