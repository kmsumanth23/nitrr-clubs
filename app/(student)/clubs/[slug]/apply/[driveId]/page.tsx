import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconLock, IconAlertTriangle } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/server";
import { getDriveForApply } from "@/lib/queries/apply";
import { ApplyForm } from "@/components/clubs/apply-form";
import { targetYearsLabel } from "@/lib/drive-format";

export const metadata = { title: "Apply — NITRR Clubs" };
export const dynamic = "force-dynamic";

/**
 * Drive-specific apply page.
 * Handles:
 *  - Auth + profile completeness gates
 *  - Drive existence + Open phase
 *  - Eligibility check (student year in target_years)
 *  - Existing application prefill (re-apply from withdrawn, or edit pending)
 *  - Zero-questions state (drive published without any questions added)
 *  - Membership / admin blocks
 */
export default async function DriveApplyPage({
  params,
}: {
  params: Promise<{ slug: string; driveId: string }>;
}) {
  const { slug, driveId } = await params;
  const supabase = await createClient();

  // Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/?signin=1&next=${encodeURIComponent(`/clubs/${slug}/apply/${driveId}`)}`,
    );
  }

  // Club lookup (to confirm slug + driveId belong together)
  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!club) notFound();

  // Profile completeness
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, roll_number, year, branch")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.roll_number || profile.year === null) {
    redirect(
      `/profile/complete?next=${encodeURIComponent(`/clubs/${slug}/apply/${driveId}`)}`,
    );
  }

  // Fetch drive with questions + eligibility state + existing application
  const driveInfo = await getDriveForApply(driveId, user.id, profile.year);
  if (!driveInfo) notFound();

  // Defensive: drive must belong to this club
  if (driveInfo.drive.club_id !== club.id) notFound();

  // Membership / admin check — nicer error than trigger rejection
  const [{ data: membership }, { data: adminRow }] = await Promise.all([
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
  ]);

  const blockReason = membership
    ? "You're already a member of this club."
    : adminRow
      ? "You manage this club, so you can't apply to it."
      : null;

  return (
    <section className="container mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/clubs/${slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={12} /> Back to {club.name}
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">
          {driveInfo.drive.name}
        </h1>
        {driveInfo.drive.description && (
          <p className="mt-1 text-sm text-ink-soft">
            {driveInfo.drive.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <span className="rounded-full bg-beige px-2 py-0.5">
            {club.name}
          </span>
          <span className="rounded-full bg-beige px-2 py-0.5">
            For {targetYearsLabel(driveInfo.drive.target_years)}
          </span>
        </div>
      </div>

      {blockReason ? (
        <BlockState message={blockReason} />
      ) : !driveInfo.eligible ? (
        <NotEligibleState
          targetYears={driveInfo.drive.target_years}
          studentYear={profile.year}
        />
      ) : driveInfo.drive.questions.length === 0 ? (
        <NoQuestionsState clubSlug={slug} />
      ) : (
        <ApplyForm
          driveId={driveInfo.drive.id}
          clubSlug={slug}
          clubName={club.name}
          profile={{
            full_name: profile.full_name,
            roll_number: profile.roll_number,
            year: profile.year,
            branch: profile.branch,
          }}
          questions={driveInfo.drive.questions}
          existingApplication={driveInfo.existing_application}
        />
      )}
    </section>
  );
}

function BlockState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-line bg-cream/40 p-6 text-center">
      <IconLock size={22} className="mx-auto mb-2 text-ink-soft" />
      <p className="text-sm text-ink">{message}</p>
    </div>
  );
}

function NotEligibleState({
  targetYears,
  studentYear,
}: {
  targetYears: number[];
  studentYear: number;
}) {
  return (
    <div className="rounded-2xl border border-line bg-cream/40 p-6 text-center">
      <IconLock size={22} className="mx-auto mb-2 text-ink-soft" />
      <h3 className="font-display text-lg font-bold text-ink">Not eligible</h3>
      <p className="mt-1 text-sm text-ink-soft">
        This drive is for Year {targetYears.join(", ")} students only. You&apos;re
        in Year {studentYear}.
      </p>
    </div>
  );
}

function NoQuestionsState({ clubSlug }: { clubSlug: string }) {
  return (
    <div className="rounded-2xl border border-clay/30 bg-clay/5 p-6 text-center">
      <IconAlertTriangle size={22} className="mx-auto mb-2 text-clay" />
      <h3 className="font-display text-lg font-bold text-ink">
        This drive isn&apos;t ready yet
      </h3>
      <p className="mt-1 text-sm text-ink-soft">
        The club hasn&apos;t added application questions to this drive yet.
        Check back soon.
      </p>
      <Link
        href={`/clubs/${clubSlug}`}
        className="mt-4 inline-flex items-center gap-1 text-xs text-indigo hover:underline"
      >
        Back to club page
      </Link>
    </div>
  );
}
