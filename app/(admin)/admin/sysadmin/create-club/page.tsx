import { redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { isSysadmin, getCategoriesForCreate } from "@/lib/queries/sysadmin";
import { CreateClubForm } from "@/components/admin/create-club-form";

export const metadata = { title: "Create club — Admin" };

export default async function CreateClubPage() {
  if (!(await isSysadmin())) redirect("/admin");

  const categories = await getCategoriesForCreate();

  return (
    <section className="container mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/admin/sysadmin"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Sysadmin
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Create a club
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Sets up a new club with its first lead. The lead can then fill in
          content, manage admins, and open recruitments.
        </p>
      </div>

      <CreateClubForm categories={categories} />
    </section>
  );
}
