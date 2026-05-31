"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconPencil,
  IconCalendarEvent,
  IconFileText,
  IconPhoto,
  IconArrowsLeftRight,
  IconExternalLink,
  IconArrowLeft,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type Tier = "lead" | "manager" | "editor";

interface ClubItem {
  slug: string;
  name: string;
  tier: Tier;
}

/**
 * Floating glass sidebar — only rendered inside /admin/clubs/<slug>/...
 * Collapsed: icon-only pill (~52px). Hover: expands to ~210px showing labels.
 * Frosted-glass styling matches the navbar pills.
 *
 * Active section is highlighted. Editors don't get the Applications link
 * (RLS would 404 them; cleaner to hide).
 */
export function AdminSidebar({
  slug,
  clubName,
  myClubs,
  myTier,
}: {
  slug: string;
  clubName: string;
  myClubs: ClubItem[];
  myTier: Tier;
}) {
  const pathname = usePathname();
  const [switchOpen, setSwitchOpen] = React.useState(false);
  const switchRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (switchRef.current && !switchRef.current.contains(e.target as Node))
        setSwitchOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const base = `/admin/clubs/${slug}`;
  const sections = [
    { href: base, icon: IconPencil, label: "Edit" },
    { href: `${base}/events`, icon: IconCalendarEvent, label: "Events" },
    ...(myTier !== "editor"
      ? [{ href: `${base}/applications`, icon: IconFileText, label: "Applications" }]
      : []),
    { href: `${base}/gallery`, icon: IconPhoto, label: "Gallery" },
  ];

  function isActive(href: string) {
    if (href === base) return pathname === base;
    return pathname.startsWith(href);
  }

  return (
    <aside className="group sticky top-24 hidden self-start md:block">
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-full border border-white/70 bg-white/55 shadow-soft backdrop-blur-md backdrop-saturate-150",
          "w-[52px] transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-hover:w-[210px] group-hover:rounded-3xl",
        )}
      >
        {/* header: managing X + back to dashboard */}
        <div className="flex flex-shrink-0 items-center gap-2 px-3 py-3">
          <Link
            href="/admin"
            aria-label="Back to dashboard"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink hover:bg-ink/10"
          >
            <IconArrowLeft size={14} />
          </Link>
          <div className="min-w-0 overflow-hidden opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="truncate text-[10px] uppercase tracking-wide text-ink-soft">
              Managing
            </div>
            <div className="truncate text-xs font-semibold text-ink">
              {clubName}
            </div>
          </div>
        </div>

        <div className="h-px bg-line/70" />

        {/* sections */}
        <nav className="flex flex-col gap-1 p-2">
          {sections.map((s) => {
            const active = isActive(s.href);
            return (
              <Link
                key={s.label}
                href={s.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-full px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-indigo text-indigo-fg"
                    : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                )}
              >
                <s.icon size={17} className="flex-shrink-0" />
                <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {s.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="h-px bg-line/70" />

        {/* utilities */}
        <div className="flex flex-col gap-1 p-2">
          {myClubs.length > 1 && (
            <div ref={switchRef} className="relative">
              <button
                onClick={() => setSwitchOpen((v) => !v)}
                className="flex w-full items-center gap-2.5 rounded-full px-2.5 py-2 text-sm text-ink-soft hover:bg-ink/5 hover:text-ink"
              >
                <IconArrowsLeftRight size={17} className="flex-shrink-0" />
                <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Switch club
                </span>
              </button>
              {switchOpen && (
                <div className="absolute left-full top-0 ml-2 w-48 overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-soft">
                  {myClubs.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/admin/clubs/${c.slug}`}
                      onClick={() => setSwitchOpen(false)}
                      className={cn(
                        "flex items-center justify-between gap-2 px-3 py-2 text-xs",
                        c.slug === slug
                          ? "bg-cream font-medium text-ink"
                          : "text-ink hover:bg-cream",
                      )}
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="rounded-full bg-beige px-1.5 text-[9px] capitalize text-ink-soft">
                        {c.tier}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <a
            href={`/clubs/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-full px-2.5 py-2 text-sm text-ink-soft hover:bg-ink/5 hover:text-ink"
          >
            <IconExternalLink size={17} className="flex-shrink-0" />
            <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              View public
            </span>
          </a>
        </div>
      </div>
    </aside>
  );
}
