import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconClipboardList, IconAlertTriangle } from "@tabler/icons-react";
import { getEditableClub } from "@/lib/queries/admin";
import { listDrivesForClub } from "@/lib/queries/admin-drives";
import { getApplicationsForDrive } from "@/lib/queries/admin-applications";
import { DrivePicker } from "@/components/admin/drive-picker";
import { ApplicationsFilter } from "@/components/admin/applications-filter";
import { PublishResultsButton } from "@/components/admin/publish-results-button";
import { getPhase, phaseLabel, PHASE_BADGE, type Phase } from "@/lib/phase";
import { targetYearsLabel } from "@/lib/drive-format";

export const metadata = { title: "Applications — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ drive?: string }>;
}) {
  const { slug } = await params;
  const { drive: driveParam } = await searchParams;

  const editable = await getEditableClub(slug);
  if (!editable) notFound();
  const { club, tier } = editable;

  if (tier === "editor") redirect(`/admin/clubs/${slug}`);

  // Fetch ALL drives for the picker (all phases including draft)
  const drives = await listDrivesForClub(club.id);

  // Zero drives → empty state
  if (drives.length === 0) {
    return <ZeroDrivesState clubName={club.name} clubSlug={slug} />;
  }

  // Determine selected drive
  const selectedDriveId =
    driveParam && drives.find((d) => d.id === driveParam)
      ? driveParam
      : pickDefaultDriveId(drives);

  // Fetch selected drive's data
  const driveData = await getApplicationsForDrive(selectedDriveId);
  if (!driveData) {
    redirect(`/admin/clubs/${slug}/applications`);
  }

  const { drive, applications, counts } = driveData;
  const phase = getPhase(drive) as Phase;
  const remainingCount = (counts.pending ?? 0) + (counts.reviewing ?? 0);
  const resultPastDue =
    phase === "review" &&
    drive.result_date &&
    new Date() > new Date(drive.result_date);
  const canPublish = tier === "lead";

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

      {/* Drive picker */}
      <DrivePicker drives={drives} selectedId={selectedDriveId} clubSlug={slug} />

      {/* Drive header info */}
      <div className="mb-4 rounded-2xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-ink">{drive.name}</h2>
          <span className="rounded-full bg-beige px-2 py-0.5 text-xs text-ink-soft">
            For {targetYearsLabel(drive.target_years)}
          </span>
        </div>
        {drive.description && (
          <p className="mt-1 text-sm text-ink-soft">{drive.description}</p>
        )}
      </div>

      {/* Zero-questions state on selected drive */}
      {drive.questions.length === 0 ? (
        <ZeroQuestionsState clubSlug={slug} driveId={drive.id} />
      ) : (
        <>
          {/* Phase banner */}
          <div className="mb-6 rounded-2xl border border-line bg-white p-4 text-sm">
            {phase === "draft" && (
              <p className="text-ink-soft">
                <span className="font-medium text-ink">Draft.</span> This drive
                isn&apos;t published. No students can apply yet.
              </p>
            )}
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
                    Result date has passed. Please finish review and publish
                    soon — applicants are waiting.
                  </p>
                )}
                {!resultPastDue && drive.result_date && (
                  <p>
                    Target result date:{" "}
                    <span className="font-medium text-ink">
                      {new Date(drive.result_date).toLocaleString("en-IN")}
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

          {/* Publish results */}
          {phase === "review" && canPublish && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink">
                  Publish results
                </div>
                <div className="mt-0.5 text-xs text-ink-soft">
                  {remainingCount > 0
                    ? `${remainingCount} application${remainingCount === 1 ? "" : "s"} still awaiting decision`
                    : "All decisions made. Ready to publish."}
                </div>
              </div>
              <PublishResultsButton
                recruitmentId={drive.id}
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

          {/* Applications filter + list */}
          <ApplicationsFilter
            applications={applications}
            counts={counts}
            clubSlug={slug}
            phase={phase}
            questions={drive.questions}
          />
        </>
      )}
    </section>
  );
}

/**
 * Default drive selection when no ?drive= param is provided.
 * Priority: most recent Open > Review > Result > Draft.
 */
function pickDefaultDriveId(
  drives: { id: string; phase: string; created_at: string }[],
): string {
  const rank = (p: string) =>
    p === "open" ? 0 : p === "review" ? 1 : p === "result" ? 2 : 3;
  const sorted = [...drives].sort((a, b) => {
    const r = rank(a.phase) - rank(b.phase);
    if (r !== 0) return r;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return sorted[0].id;
}

function ZeroDrivesState({
  clubName,
  clubSlug,
}: {
  clubName: string;
  clubSlug: string;
}) {
  return (
    <section>
      <Link
        href={`/admin/clubs/${clubSlug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Edit {clubName}
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">
        Applications
      </h1>
      <div className="mt-6 rounded-3xl border border-dashed border-line bg-white p-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cream text-ink-soft">
          <IconClipboardList size={22} />
        </div>
        <h2 className="font-display text-lg font-bold text-ink">
          No drives yet
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
          Create a recruitment drive first — applications will show up here
          once students start applying.
        </p>
        <Link
          href={`/admin/clubs/${clubSlug}/recruitment`}
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90"
        >
          Go to recruitment
        </Link>
      </div>
    </section>
  );
}

function ZeroQuestionsState({
  clubSlug,
  driveId,
}: {
  clubSlug: string;
  driveId: string;
}) {
  return (
    <div className="rounded-2xl border border-clay/30 bg-clay/5 p-6 text-center">
      <IconAlertTriangle size={22} className="mx-auto mb-2 text-clay" />
      <h3 className="font-display text-lg font-bold text-ink">
        This drive has no questions
      </h3>
      <p className="mt-1 max-w-md text-sm text-ink-soft">
        Students can&apos;t apply to a drive without questions. Add at least one
        before the drive can accept applications.
      </p>
      <Link
        href={`/admin/clubs/${clubSlug}/recruitment/${driveId}`}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-indigo-fg hover:bg-indigo/90"
      >
        Add questions
      </Link>
    </div>
  );
}
