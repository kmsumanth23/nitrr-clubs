import { redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { isSysadmin } from "@/lib/queries/sysadmin";
import { BulkImportForm } from "@/components/admin/bulk-import-form";

export const metadata = { title: "Bulk import — Sysadmin" };
export const dynamic = "force-dynamic";

export default async function SysadminBulkImportPage() {
  if (!(await isSysadmin())) redirect("/admin");

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
          Bulk import clubs
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Create multiple clubs at once from a CSV. Each row becomes a club
          with its assigned lead. Lead profiles must exist in the system
          (sign-up first), referenced by their roll number.
        </p>
      </div>

      <BulkImportForm />
    </section>
  );
}
