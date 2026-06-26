import { redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { isSysadmin } from "@/lib/queries/sysadmin";
import { getCategoriesForAdmin } from "@/lib/queries/categories-admin";
import { CategoryList } from "@/components/admin/category-list";

export const metadata = { title: "Categories — Sysadmin" };
export const dynamic = "force-dynamic";

export default async function SysadminCategoriesPage() {
  if (!(await isSysadmin())) redirect("/admin");

  const categories = await getCategoriesForAdmin();

  return (
    <section className="container mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/admin/sysadmin"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Sysadmin
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Categories
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Tags that group clubs on /clubs and the homepage filter. Categories
          with active clubs can&apos;t be deleted until you reassign those clubs.
        </p>
      </div>

      <CategoryList categories={categories} />
    </section>
  );
}
