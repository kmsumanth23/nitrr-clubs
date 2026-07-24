import Link from "next/link";
import {
  IconHome,
  IconCalendarEvent,
  IconBrandInstagram,
  IconShieldCheck,
} from "@tabler/icons-react";
import { WhatsAppLinkButton } from "@/components/ui/whatsapp-link-popup";
import { displayRoleLabel, type Role } from "@/lib/roles";
import type { MyMembership } from "@/lib/queries/profile";

/**
 * "My Clubs" card grid on /profile — 17A redesign.
 *
 * Layout: 2-col grid on desktop (md+), 1 col on mobile.
 * Each card matches the admin dashboard club-card structure:
 *  - Top: club name (link) + category pill
 *  - Meta: joined date
 *  - Bottom: quick links (icons only, tooltip labels)
 *
 * Quick links:
 *  - Club page (home icon)
 *  - Events (calendar icon) — deep-links to #events on club page
 *  - Instagram (brand icon, only if instagram_url set)
 *  - Community WhatsApp (green icon, only if community link set)
 */
export function MyClubsList({
  memberships,
}: {
  memberships: MyMembership[];
}) {
  if (memberships.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-white p-6 text-center text-sm text-ink-soft">
        You&apos;re not a member of any clubs yet. Explore{" "}
        <Link href="/clubs" className="font-medium text-indigo hover:underline">
          all clubs
        </Link>{" "}
        and apply to ones that interest you.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {memberships.map((m) => (
        <MembershipCard key={m.club_id} membership={m} />
      ))}
    </div>
  );
}

function MembershipCard({ membership }: { membership: MyMembership }) {
  const club = membership.club;
  if (!club) return null;

  const instagramUrl = club.instagram_url ?? null;
  const communityLink = club.community_whatsapp_link ?? null;

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-white p-4">
      {/* Top row: club name + role/web-admin pills + category */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/clubs/${club.slug}`}
            className="block truncate font-display text-lg font-bold text-ink hover:text-indigo"
          >
            {club.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-indigo-soft px-2 py-0.5 text-[10px] font-medium text-indigo">
              {displayRoleLabel(membership.role as Role, membership.role_label)}
            </span>
            {membership.admin_tier && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-clay-soft px-2 py-0.5 text-[10px] font-medium text-clay"
                title={`You're a ${membership.admin_tier} on this club's web-admin team`}
              >
                <IconShieldCheck size={9} /> Web {membership.admin_tier}
              </span>
            )}
          </div>
        </div>
        {club.category?.name && (
          <span className="flex-shrink-0 rounded-full bg-beige px-1.5 py-0.5 text-[10px] capitalize text-ink-soft">
            {club.category.name}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="mb-3 text-[11px] text-ink-soft">
        Joined{" "}
        {new Date(membership.joined_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </div>

      {/* Quick links */}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <QuickLinkChip
          href={`/clubs/${club.slug}`}
          icon={IconHome}
          label="Club page"
        />
        <QuickLinkChip
          href={`/clubs/${club.slug}#events`}
          icon={IconCalendarEvent}
          label="Events"
        />
        {instagramUrl && (
          <QuickLinkChip
            href={instagramUrl}
            icon={IconBrandInstagram}
            label="Instagram"
            external
            iconClassName="text-[#E4405F]"
          />
        )}
        {communityLink && (
          <WhatsAppLinkButton
            url={communityLink}
            label={`${club.name} community group`}
            size="md"
          />
        )}
      </div>
    </div>
  );
}

/** Square icon chip that acts as a link. Icon-only with an accessible label
 *  + tooltip via title. `iconClassName` lets brand icons (e.g. Instagram)
 *  keep their signature color even when the chip's neutral hover state runs. */
function QuickLinkChip({
  href,
  icon: Icon,
  label,
  external,
  iconClassName,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  external?: boolean;
  iconClassName?: string;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:border-indigo/40 hover:bg-cream hover:text-indigo"
    >
      <Icon size={18} className={iconClassName} />
    </Link>
  );
}
