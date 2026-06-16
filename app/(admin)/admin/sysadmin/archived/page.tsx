import { redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { isSysadmin, getArchivedClubs } from "@/lib/queries/sysadmin";
import { ArchivedClubRow } from "@/components/admin/archived-club-row";

export const metadata = { title: "Archived clubs — Admin" };

export default async function ArchivedClubsPage() {
  if (!(await isSysadmin())) redirect("/admin");

  const clubs = await getArchivedClubs();

  return (
    <section className="container mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/admin/sysadmin"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Sysadmin
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Archived clubs
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Clubs that have been decommissioned. Their data is preserved; you can
          restore any club to make it live again.
        </p>
      </div>

      {clubs.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
          No archived clubs. All clubs are currently active.
        </p>
      ) : (
        <ul className="space-y-2">
          {clubs.map((c) => (
            <ArchivedClubRow key={c.id} club={c} />
          ))}
        </ul>
      )}
    </section>
  );
}
