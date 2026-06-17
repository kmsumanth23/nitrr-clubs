import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { getEditableClub } from "@/lib/queries/admin";
import { getAdminsForClub } from "@/lib/queries/admin-admins";
import { AdminsList } from "@/components/admin/admins-list";
import { AddAdminModal } from "@/components/admin/add-admin-modal";
import { ExportCsvButton } from "@/components/admin/export-csv-button";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admins — Admin" };

export default async function AdminAdminsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getEditableClub(slug);
  if (!data) notFound();
  const { club, tier } = data;

  const admins = await getAdminsForClub(club.id);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isSuper = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isSuper = profile?.role === "super_admin";
  }
  const viewerCanManage = isSuper || tier === "lead";

  return (
    <section>
      <Link
        href={`/admin/clubs/${slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Edit {club.name}
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Admins
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            People who manage {club.name}.
            {!viewerCanManage && (
              <> You can view this list but only the lead can make changes.</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportCsvButton
            href={`/admin/api/export/club-roster?slug=${slug}`}
            label="Export CSV"
            compact
          />
          {viewerCanManage && (
            <AddAdminModal clubId={club.id} clubSlug={slug} />
          )}
        </div>
      </div>

      <AdminsList
        admins={admins}
        clubId={club.id}
        clubSlug={slug}
        viewerCanManage={viewerCanManage}
      />
    </section>
  );
}
