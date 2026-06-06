import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { getEditableClub } from "@/lib/queries/admin";
import { getMembersForClub } from "@/lib/queries/admin-members";
import { MembersList } from "@/components/admin/members-list";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Members — Admin" };

export default async function AdminMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getEditableClub(slug);
  if (!data) notFound();
  const { club, tier } = data;

  // editors can't manage members
  if (tier === "editor") redirect(`/admin/clubs/${slug}`);

  // Determine if the current viewer is super_admin (for cross-lead removal)
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

  const members = await getMembersForClub(club.id);

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
          Members
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          The club&apos;s current roster. Only the lead can remove members.
        </p>
      </div>

      <MembersList
        members={members}
        clubId={club.id}
        clubSlug={slug}
        viewerTier={tier}
        viewerIsSuper={isSuper}
      />
    </section>
  );
}
