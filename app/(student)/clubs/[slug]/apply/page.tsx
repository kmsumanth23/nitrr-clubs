import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconArrowRight, IconLock } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/server";
import { getOpenDrivesForClub } from "@/lib/queries/apply";
import { targetYearsLabel } from "@/lib/drive-format";

export const metadata = { title: "Apply — NITRR Clubs" };
export const dynamic = "force-dynamic";

/**
 * Apply landing page — redirects based on open drive count.
 *  - 0 open drives → redirect to club detail
 *  - 1 open drive → redirect to /clubs/[slug]/apply/[driveId]
 *  - 2+ open drives → show picker (this page)
 *
 * Not signed in → sign-in flow.
 * Missing profile.year → complete profile flow.
 */
export default async function ApplyLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Auth gate
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/?signin=1&next=${encodeURIComponent(`/clubs/${slug}/apply`)}`);
  }

  // Club lookup
  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!club) notFound();

  // Profile completeness gate
  const { data: profile } = await supabase
    .from("profiles")
    .select("year, roll_number")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.roll_number || profile.year === null) {
    redirect(
      `/profile/complete?next=${encodeURIComponent(`/clubs/${slug}/apply`)}`,
    );
  }

  // Fetch open drives with per-student eligibility
  const drives = await getOpenDrivesForClub(club.id, user.id, profile.year);

  // No open drives → back to club detail
  if (drives.length === 0) {
    redirect(`/clubs/${slug}`);
  }

  // Exactly one → straight to the drive-specific apply page
  if (drives.length === 1) {
    redirect(`/clubs/${slug}/apply/${drives[0].id}`);
  }

  // Multiple → picker
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
          Choose a drive to apply
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {club.name} is running {drives.length} drives. Pick the one that
          fits.
        </p>
      </div>

      <div className="space-y-3">
        {drives.map((d) => {
          const applyHref = `/clubs/${slug}/apply/${d.id}`;
          return (
            <div
              key={d.id}
              className={
                "rounded-2xl border p-5 " +
                (d.eligible
                  ? "border-line bg-white"
                  : "border-line bg-cream/40 opacity-70")
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-bold text-ink">
                    {d.name}
                  </h3>
                  {d.description && (
                    <p className="mt-1 text-sm text-ink-soft">
                      {d.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                    <span className="rounded-full bg-beige px-2 py-0.5">
                      For {targetYearsLabel(d.target_years)}
                    </span>
                  </div>
                </div>

                {d.has_applied ? (
                  <Link
                    href={applyHref}
                    className="rounded-full border border-indigo bg-indigo/5 px-3 py-1.5 text-xs font-medium text-indigo hover:bg-indigo/10"
                  >
                    View application
                  </Link>
                ) : d.eligible ? (
                  <Link
                    href={applyHref}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo px-4 py-2 text-sm text-indigo-fg hover:bg-indigo/90"
                  >
                    Apply <IconArrowRight size={12} />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cream px-3 py-1.5 text-xs text-ink-soft">
                    <IconLock size={11} /> Not eligible
                  </span>
                )}
              </div>
              {!d.eligible && (
                <p className="mt-2 text-[11px] text-ink-soft">
                  For Year {d.target_years.join(", ")} students only.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
