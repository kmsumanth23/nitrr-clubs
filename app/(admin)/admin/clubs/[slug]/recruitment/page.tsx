import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { getEditableClub } from "@/lib/queries/admin";
import { RecruitmentSection } from "@/components/admin/recruitment-section";

export const metadata = { title: "Recruitment — Admin" };

export default async function AdminRecruitmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getEditableClub(slug);
  if (!data) notFound();
  const { club, tier, current_recruitment } = data;

  // Editor doesn't manage recruitment lifecycle (same rule as Applications)
  if (tier === "editor") redirect(`/admin/clubs/${slug}`);

  return (
    <section>
      <Link
        href={`/admin/clubs/${slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Edit {club.name}
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Recruitment
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Manage the recruitment cycle for {club.name}. Start a new drive,
          edit deadlines, control public visibility.
        </p>
      </div>

      <RecruitmentSection
        clubId={club.id}
        clubSlug={slug}
        isRecruiting={club.is_recruiting}
        currentRecruitment={current_recruitment}
      />
    </section>
  );
}
