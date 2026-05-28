import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/server";
import { ApplyForm } from "@/components/clubs/apply-form";
import { isOpen, deadlineLabel } from "@/lib/deadline";

export const metadata = { title: "Apply — NITRR Clubs" };

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/?signin=1&next=${encodeURIComponent(`/clubs/${slug}/apply`)}`);
  }

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, slug, is_recruiting, recruitment_deadline")
    .eq("slug", slug)
    .maybeSingle();
  if (!club) notFound();

  if (!club.is_recruiting) redirect(`/clubs/${slug}`);

  // profile completeness gate
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, roll_number, year, branch")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.roll_number) {
    redirect(`/profile/complete?next=/clubs/${slug}/apply`);
  }

  const open = isOpen(club.recruitment_deadline);

  // already a member or admin? the DB trigger blocks it, but check here for a
  // clean message instead of a failed submit.
  const [{ data: membership }, { data: adminRow }, { data: existing }] =
    await Promise.all([
      supabase
        .from("club_members")
        .select("id")
        .eq("club_id", club.id)
        .eq("profile_id", user.id)
        .maybeSingle(),
      supabase
        .from("club_admins")
        .select("id")
        .eq("club_id", club.id)
        .eq("profile_id", user.id)
        .maybeSingle(),
      supabase
        .from("applications")
        .select("status")
        .eq("club_id", club.id)
        .eq("profile_id", user.id)
        .maybeSingle(),
    ]);

  const blockReason = membership
    ? "You're already a member of this club."
    : adminRow
      ? "You manage this club, so you can't apply to it."
      : null;

  return (
    <section className="mx-auto max-w-xl px-6 pb-20 pt-28">
      <Link
        href={`/clubs/${slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Back to {club.name}
      </Link>

      <h1 className="text-3xl font-extrabold tracking-tight text-ink">
        Apply to {club.name}
      </h1>
      <p className="mb-8 mt-2 text-sm text-ink-soft">
        {deadlineLabel(club.recruitment_deadline)}
      </p>

      {blockReason ? (
        <div className="rounded-2xl border border-line bg-white p-6 text-sm text-ink">
          {blockReason}
        </div>
      ) : !open ? (
        <div className="rounded-2xl border border-line bg-white p-6 text-sm text-ink">
          Applications for this club are closed. You may contact the club lead
          for queries.
        </div>
      ) : (
        <ApplyForm
          clubId={club.id}
          clubName={club.name}
          profile={profile}
          existingStatus={existing?.status ?? null}
        />
      )}
    </section>
  );
}
