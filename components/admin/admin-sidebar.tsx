import Link from "next/link";
import {
  IconLayoutDashboard,
  IconBuildingCommunity,
  IconCalendarEvent,
  IconPhoto,
  IconFileText,
} from "@tabler/icons-react";

/**
 * Admin sidebar — sticky on desktop. Quick links to dashboards/CRUDs.
 * 9c (events), 9d (applications), 9e (gallery) pages don't exist yet — the
 * links are placeholders that route to a placeholder /admin route until built.
 */
export function AdminSidebar({ isSuper }: { isSuper: boolean }) {
  const items = [
    { href: "/admin", label: "Dashboard", icon: IconLayoutDashboard },
    { href: "/admin#clubs", label: "My clubs", icon: IconBuildingCommunity },
    // 9c+
    { href: "/admin#events", label: "Events", icon: IconCalendarEvent },
    { href: "/admin#applications", label: "Applications", icon: IconFileText },
    { href: "/admin#gallery", label: "Gallery", icon: IconPhoto },
  ];
  return (
    <aside className="hidden w-56 flex-shrink-0 md:block">
      <nav className="sticky top-24 space-y-1 rounded-2xl border border-line bg-white p-2">
        {items.map((it) => (
          <Link
            key={it.label}
            href={it.href}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-cream hover:text-ink"
          >
            <it.icon size={16} />
            {it.label}
          </Link>
        ))}
        {isSuper && (
          <div className="mt-2 border-t border-line pt-2">
            <div className="px-3 pb-1 text-[10px] uppercase tracking-wide text-ink-soft">
              Super admin
            </div>
            <div className="px-3 py-2 text-xs text-ink-soft">
              Console (later step)
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
