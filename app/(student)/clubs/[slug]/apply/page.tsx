import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/server";
import { ApplyForm } from "@/components/clubs/apply-form";

export const metadata = { title: "Apply — NITRR Clubs" };

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Auth check FIRST, with the known slug, so we can return the user precisely
  // to this apply page after they sign in.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/?signin=1&next=${encodeURIComponent(`/clubs/${slug}/apply`)}`);
  }

  // club (need id + name)
  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, slug, is_recruiting")
    .eq("slug", slug)
    .maybeSingle();
  if (!club) notFound();

  // recruitment closed → back to club page
  if (!club.is_recruiting) redirect(`/clubs/${slug}`);

  // profile + completeness gate
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, roll_number, year, branch")
    .eq("id", user.id)
    .maybeSingle();

  // missing required info (e.g. Google sign-in) → complete profile first
  if (!profile?.roll_number) {
    redirect(`/profile/complete?next=/clubs/${slug}/apply`);
  }

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
        A few quick questions. Your details below come from your profile.
      </p>

      <ApplyForm clubId={club.id} clubName={club.name} profile={profile} />
    </section>
  );
}
