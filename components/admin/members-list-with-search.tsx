"use client";

import * as React from "react";
import { IconSearch } from "@tabler/icons-react";
import { MemberRow } from "@/components/admin/member-row";
import { ROLE_DEFAULT_LABELS, type Role } from "@/lib/roles";
import type { MembershipDetail } from "@/lib/queries/admin-members";
import type { AdminTier } from "@/lib/database.types";

type GroupedMembers = Array<{ role: Role; members: MembershipDetail[] }>;

/**
 * Client-side filter over the already-scoped `getMembersGroupedByRole`
 * result. Matches `full_name` OR `roll_number`, case-insensitive. Empty
 * groups collapse dynamically. No cross-club leakage: input never queries
 * `profiles` globally — filtering happens in memory on the pre-scoped list.
 */
export function MembersListWithSearch({
  groupedMembers,
  clubId,
  clubSlug,
  viewerTier,
  viewerIsSuper,
}: {
  groupedMembers: GroupedMembers;
  clubId: string;
  clubSlug: string;
  viewerTier: AdminTier;
  viewerIsSuper: boolean;
}) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return groupedMembers;

    return groupedMembers
      .map((group) => ({
        role: group.role,
        members: group.members.filter((m) => {
          const name = (m.profile?.full_name ?? "").toLowerCase();
          const roll = (m.profile?.roll_number ?? "").toLowerCase();
          return name.includes(q) || roll.includes(q);
        }),
      }))
      .filter((group) => group.members.length > 0);
  }, [groupedMembers, query]);

  const totalMatches = filtered.reduce((sum, g) => sum + g.members.length, 0);

  return (
    <>
      <div className="relative mb-4">
        <IconSearch
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or roll number"
          className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-indigo"
        />
        {query.length > 0 && (
          <p className="mt-1.5 text-[11px] text-ink-soft">
            {totalMatches} member{totalMatches === 1 ? "" : "s"} matching
            &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-center text-sm text-ink-soft">
          {query.length > 0
            ? `No members match "${query}".`
            : "No members yet."}
        </p>
      ) : (
        <div className="space-y-6">
          {filtered.map((group) => (
            <section key={group.role}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {ROLE_DEFAULT_LABELS[group.role]} ({group.members.length})
              </h3>
              <ul className="space-y-2">
                {group.members.map((m) => (
                  <MemberRow
                    key={m.profile_id}
                    member={m}
                    clubId={clubId}
                    clubSlug={clubSlug}
                    viewerTier={viewerTier}
                    viewerIsSuper={viewerIsSuper}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
