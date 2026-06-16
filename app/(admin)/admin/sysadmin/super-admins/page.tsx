import { redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/server";
import { isSysadmin, getSuperAdmins } from "@/lib/queries/sysadmin";
import { SuperAdminRow } from "@/components/admin/super-admin-row";
import { PromoteSuperAdminModal } from "@/components/admin/promote-super-admin-modal";

export const metadata = { title: "Sysadmins — Admin" };

export default async function SuperAdminsPage() {
  if (!(await isSysadmin())) redirect("/admin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? "";

  const superAdmins = await getSuperAdmins();

  return (
    <section className="container mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/admin/sysadmin"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Sysadmin
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Sysadmins
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {superAdmins.length} active sysadmin{superAdmins.length === 1 ? "" : "s"}.
          </p>
        </div>
        <PromoteSuperAdminModal />
      </div>

      {superAdmins.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
          No sysadmins. This shouldn&apos;t happen — at least one is needed
          to manage the system.
        </p>
      ) : (
        <ul className="space-y-2">
          {superAdmins.map((sa) => (
            <SuperAdminRow
              key={sa.id}
              profile={sa}
              currentUserId={currentUserId}
              totalCount={superAdmins.length}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
