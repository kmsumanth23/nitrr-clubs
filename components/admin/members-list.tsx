import { MemberRow } from "@/components/admin/member-row";
import type { ClubMemberView } from "@/lib/queries/admin-members";
import type { AdminTier } from "@/lib/database.types";

export function MembersList({
  members,
  clubId,
  clubSlug,
  viewerTier,
  viewerIsSuper,
}: {
  members: ClubMemberView[];
  clubId: string;
  clubSlug: string;
  viewerTier: AdminTier;
  viewerIsSuper: boolean;
}) {
  if (members.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
        No members yet. Members materialize when a recruitment is published.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {members.map((m) => (
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
  );
}
