import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { getEditableClub } from "@/lib/queries/admin";
import {
  getApplicationsForClub,
  getApplicationCountsForClub,
} from "@/lib/queries/admin-applications";
import { ApplicationsFilter } from "@/components/admin/applications-filter";
import { PublishResultsButton } from "@/components/admin/publish-results-button";
import { getPhase, phaseLabel, PHASE_BADGE } from "@/lib/phase";

export const metadata = { title: "Applications — Admin" };

export default async function AdminApplicationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getEditableClub(slug);
  if (!data) notFound();

  const { club, tier } = data;

  // editors can't review apps
  if (tier === "editor") {
    redirect(`/admin/clubs/${slug}`);
  }

  const [applications, counts] = await Promise.all([
    getApplicationsForClub(club.id),
    getApplicationCountsForClub(club.id),
  ]);

  // phase from the club's own fields (already on `club`)
  const phase = getPhase({
    recruitment_deadline: club.recruitment_deadline,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result_date: (club as any).result_date,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results_published_at: (club as any).results_published_at,
  });

  const remainingCount =
    (counts.pending ?? 0) + (counts.reviewing ?? 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultDateIso = (club as any).result_date as string | null;
  const resultPastDue =
    phase === "review" &&
    resultDateIso &&
    new Date() > new Date(resultDateIso);
  const canPublish = tier === "lead"; // managers can't publish

  return (
    <section>
      <Link
        href={`/admin/clubs/${slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Edit {club.name}
      </Link>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Applications
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Review applications to {club.name}.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${PHASE_BADGE[phase]}`}
        >
          {phaseLabel(phase)}
        </span>
      </div>

      {/* phase banner */}
      <div className="mb-6 rounded-2xl border border-line bg-white p-4 text-sm">
        {phase === "open" && (
          <p className="text-ink-soft">
            <span className="font-medium text-ink">Open phase.</span>{" "}
            Students are still applying. You can read applications and add
            internal notes; accept / reject open after the deadline.
          </p>
        )}
        {phase === "review" && (
          <div className="space-y-2 text-ink-soft">
            <p>
              <span className="font-medium text-ink">Review phase.</span>{" "}
              Decisions are open. Students can no longer edit or withdraw.
            </p>
            {resultPastDue && (
              <p className="text-clay">
                Result date has passed. Please finish review and publish soon
                — applicants are waiting.
              </p>
            )}
            {!resultPastDue && resultDateIso && (
              <p>
                Target result date:{" "}
                <span className="font-medium text-ink">
                  {new Date(resultDateIso).toLocaleString("en-IN")}
                </span>
              </p>
            )}
          </div>
        )}
        {phase === "result" && (
          <p className="text-ink-soft">
            <span className="font-medium text-ink">Results published.</span>{" "}
            Accepted students are now members. Applications are locked.
          </p>
        )}
      </div>

      {/* publish panel — only for leads in review phase */}
      {phase === "review" && canPublish && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
          <div className="min-w-0">
            <div className="text-sm font-medium text-ink">Publish results</div>
            <div className="mt-0.5 text-xs text-ink-soft">
              {remainingCount > 0
                ? `${remainingCount} application${remainingCount === 1 ? "" : "s"} still awaiting decision`
                : "All decisions made. Ready to publish."}
            </div>
          </div>
          <PublishResultsButton
            clubId={club.id}
            clubSlug={slug}
            remainingCount={remainingCount}
          />
        </div>
      )}
      {phase === "review" && !canPublish && remainingCount === 0 && (
        <div className="mb-6 rounded-2xl border border-line bg-white p-4 text-sm text-ink-soft">
          All decisions are made. Notify a lead to publish results.
        </div>
      )}

      <ApplicationsFilter
        applications={applications}
        counts={counts}
        clubSlug={slug}
        phase={phase}
      />
    </section>
  );
}
