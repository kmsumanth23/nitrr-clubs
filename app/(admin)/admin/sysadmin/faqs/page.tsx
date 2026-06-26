import { redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { isSysadmin } from "@/lib/queries/sysadmin";
import { getFaqsForAdmin } from "@/lib/queries/faqs-admin";
import { FaqList } from "@/components/admin/faq-list";

export const metadata = { title: "FAQs — Sysadmin" };
export const dynamic = "force-dynamic";

export default async function SysadminFaqsPage() {
  if (!(await isSysadmin())) redirect("/admin");

  const faqs = await getFaqsForAdmin();

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
          FAQs
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          The accordion on the homepage and /faq page. Published FAQs are
          visible to the public; unpublished FAQs are saved but hidden.
        </p>
      </div>

      <FaqList faqs={faqs} />
    </section>
  );
}
