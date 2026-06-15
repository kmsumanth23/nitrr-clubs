import { AdminRow } from "@/components/admin/admin-row";
import type { ClubAdminView } from "@/lib/queries/admin-admins";

export function AdminsList({
  admins,
  clubId,
  clubSlug,
  viewerCanManage,
}: {
  admins: ClubAdminView[];
  clubId: string;
  clubSlug: string;
  viewerCanManage: boolean;
}) {
  if (admins.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
        No admins yet. Add the first lead to get started.
      </p>
    );
  }

  const leadCount = admins.filter((a) => a.tier === "lead").length;
  const isLastLead = leadCount === 1;

  const groups: { label: string; tier: ClubAdminView["tier"] }[] = [
    { label: "Lead", tier: "lead" },
    { label: "Manager", tier: "manager" },
    { label: "Editor", tier: "editor" },
  ];

  return (
    <div className="space-y-6">
      {groups.map(({ label, tier }) => {
        const inTier = admins.filter((a) => a.tier === tier);
        if (inTier.length === 0) return null;
        return (
          <section key={tier}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">
              {label}{" "}
              <span className="ml-1 rounded-full bg-beige px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-ink-soft">
                {inTier.length}
              </span>
            </h2>
            <ul className="space-y-2">
              {inTier.map((a) => (
                <AdminRow
                  key={a.profile_id}
                  admin={a}
                  clubId={clubId}
                  clubSlug={clubSlug}
                  viewerCanManage={viewerCanManage}
                  isLastLead={isLastLead}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
