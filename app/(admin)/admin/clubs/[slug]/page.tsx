import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { getEditableClub, getCategoriesList } from "@/lib/queries/admin";
import { ClubEditForm } from "@/components/admin/club-edit-form";

export const metadata = { title: "Edit club — Admin" };

export default async function AdminClubEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [data, categories] = await Promise.all([
    getEditableClub(slug),
    getCategoriesList(),
  ]);
  if (!data) notFound();

  const { club, category, tier, current_recruitment } = data;

  return (
    <section>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Admin dashboard
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            {club.name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Edit your club&apos;s public content. Changes appear on{" "}
            <Link
              href={`/clubs/${club.slug}`}
              className="font-medium text-indigo hover:underline"
            >
              the public page
            </Link>{" "}
            within a minute.
          </p>
        </div>
        <Link
          href={`/clubs/${club.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs text-ink-soft hover:border-ink/30 hover:text-ink"
        >
          View public page <IconExternalLink size={13} />
        </Link>
      </div>

      <ClubEditForm
        club={{ ...club, category }}
        categories={categories}
        tier={tier}
        currentRecruitment={current_recruitment}
      />
    </section>
  );
}
