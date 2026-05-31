"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

type Tier = "lead" | "manager" | "editor";

interface ClubItem {
  slug: string;
  name: string;
  tier: Tier;
}

/**
 * Renders the sidebar only inside /admin/clubs/<slug>/... routes. On the
 * bare /admin dashboard, the page is full-width.
 *
 * Reads the slug from the pathname so the sidebar knows which club it's
 * scoped to without each page passing it in.
 */
export function AdminShell({
  clubs,
  children,
}: {
  clubs: ClubItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // /admin/clubs/<slug>/... → capture slug
  const match = pathname.match(/^\/admin\/clubs\/([^/]+)/);
  const slug = match?.[1];
  const club = slug ? clubs.find((c) => c.slug === slug) : undefined;

  const showSidebar = !!club;

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-6 pb-20">
      {showSidebar && club && (
        <AdminSidebar
          slug={club.slug}
          clubName={club.name}
          myClubs={clubs}
          myTier={club.tier}
        />
      )}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
